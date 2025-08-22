const { v4: uuidv4 } = require('uuid');
const Message = require('../models/Message');
const Group = require('../models/Group');
let users = [];

module.exports = (io, groups) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        // ... (di chuyển toàn bộ logic socket.on vào đây)
        socket.emit('users', users);
        //socket.emit('groups', groups);


        const updateGroupsForUser = async (username) => {
            try {
                const userGroups = await Group.find({ members: username }).lean();
                const userSocket = users.find(u => u.username === username);
                if (userSocket) {
                    io.to(userSocket.id).emit('groups', userGroups);
                }
            } catch (err) {
                console.error('Error fetching groups for user:', err);
            }
        };

        socket.on('join', async (username) => {
            // ...
            console.log(`${username} joined with socket ID: ${socket.id}`);
            socket.username = username;
            if (!users.find((u) => u.username === username)) {
                users.push({ id: socket.id, username });
            }
            io.emit('users', users);

            // Query DB để lấy groups mà user là thành viên
            try {
                const userGroups = await Group.find({ members: username }).lean();
                socket.emit('groups', userGroups); // Emit groups của user này
                console.log(`Sent ${userGroups.length} groups to ${username}`);

                // Tự động join user vào tất cả group rooms
                userGroups.forEach((group) => {
                    socket.join(group.id);
                    console.log(`${username} auto-joined group ${group.id}`);
                });
            } catch (err) {
                console.error('Error fetching groups for user:', err);
                socket.emit('error', { message: 'Không thể tải danh sách nhóm' });
            }

        });

        socket.on('createGroup', async ({ groupName, members }) => {
            // ...
            const groupId = uuidv4();
            const fullMembers = [socket.username, ...members]; // Đảm bảo unique nếu cần: new Set([...])
            console.log('members in groups: ', fullMembers);
            const newGroup = { id: groupId, name: groupName, members: fullMembers, creator: socket.username };

            //io.emit('groups', groups);

            // Save vào DB
            try {
                const groupDoc = new Group(newGroup);
                await groupDoc.save();
                console.log(`Saved new group ${groupId} to DB`);
            } catch (err) {
                console.error('Error saving group:', err);
                // Handle error, ví dụ emit error đến socket
                return;
            }
            groups.push(newGroup);

            // Join members online vào room
            fullMembers.forEach((member) => {
                const memberSocket = users.find((u) => u.username === member);
                if (memberSocket) {
                    const memberSock = io.sockets.sockets.get(memberSocket.id);
                    if (memberSock) {
                        memberSock.join(groupId);
                        console.log(`${member} joined group room ${groupId}`);
                    }
                }
            });

            // Emit system message đến room (bây giờ đã join, nên dùng io.to(room) thay vì từng id)
            io.to(groupId).emit('message', {
                room: groupId,
                user: 'Hệ thống',
                text: `${socket.username} đã tạo nhóm "${groupName}"`,
                timestamp: new Date(),
            });

            // Lưu thông báo tạo nhóm vào DB
            const systemMessage = new Message({
                room: groupId,
                user: 'Hệ thống',
                text: `${socket.username} đã tạo nhóm "${groupName}"`,
                isGroup: true,
            });
            await systemMessage.save();


            // Emit groups updated CHỈ đến members của group mới (filtered cho từng người)
            fullMembers.forEach((member) => {
                const memberSocket = users.find((u) => u.username === member);
                if (memberSocket) {
                    const updatedGroups = groups.filter(g => g.members.includes(member));
                    io.to(memberSocket.id).emit('groups', updatedGroups);
                }
            });
        });

        socket.on('sendMessage', async ({ recipient, message, isGroup }) => {
            // ...
            let room;
            const timestamp = new Date();
            if (isGroup) {
                room = recipient;
                let group = groups.find((g) => g.id === recipient);
                if (!group) {
                    // Fallback query DB nếu group không có trong cache
                    group = await Group.findOne({ id: recipient }).lean();
                    if (group) groups.push(group);
                }

                if (group && group.members.includes(socket.username)) {
                    const msg = new Message({
                        room,
                        user: socket.username,
                        text: message,
                        isGroup: true,
                        seenBy: [socket.username]
                    });
                    await msg.save();

                    io.to(room).emit('message', {
                        ...msg.toObject(),
                        timestamp,   
                        isNew: true
                    });
                }
            } else {
                const recipientSocket = users.find((u) => u.username === recipient);
                const usersSorted = [socket.username, recipient].sort();
                room = usersSorted.join('-');
                socket.join(room);

                const msg = new Message({
                    room,
                    user: socket.username,
                    text: message,
                    timestamp,
                    isGroup: false,
                    seenBy: [socket.username]
                });
                await msg.save();

                const messagePayload = {
                    ...msg.toObject(),
                    isNew: true 
                };

                // Gửi tin nhắn đến người gửi để tự cập nhật UI
                socket.emit('message', msg);

                if (recipientSocket) {
                    io.to(recipientSocket.id).emit('message', messagePayload);
                }
            }
        });

        socket.on('getMessageHistory', async ({ room, isGroup }) => {
            // ...
            const messages = await Message.find({ room, isGroup }).sort({ timestamp: 1 }).limit(50);
            socket.emit('messageHistory', messages.map(msg => msg.toObject()));
        });

        // Mới: Sự kiện đánh dấu đã xem
        socket.on('markAsSeen', async ({ room, isGroup }) => {
            if (!socket.username) return;

            // Tìm tất cả tin nhắn trong room chưa được user này xem (seenBy không chứa username)
            const messagesToUpdate = await Message.find({
                room,
                isGroup,
                seenBy: { $ne: socket.username }  // $ne: not equal
            });

            if (messagesToUpdate.length > 0) {
                // Cập nhật bulk: Thêm username vào seenBy của tất cả tin nhắn chưa xem
                await Message.updateMany(
                    { _id: { $in: messagesToUpdate.map(m => m._id) } },
                    { $addToSet: { seenBy: socket.username } }  // $addToSet để tránh duplicate
                );

                // Emit cập nhật seenBy đến tất cả thành viên trong room (trừ người vừa xem, vì họ đã biết)
                const updatedMessages = await Message.find({ _id: { $in: messagesToUpdate.map(m => m._id) } });
                const payload = updatedMessages.map(msg => ({ id: msg._id, seenBy: msg.seenBy }));

                if (isGroup) {
                    socket.to(room).emit('messageSeen', { room, updates: payload });
                } else {
                    // Chat 1-1: Tìm người kia và emit
                    const [user1, user2] = room.split('-');
                    const otherUser = user1 === socket.username ? user2 : user1;
                    const otherSocket = users.find(u => u.username === otherUser);
                    if (otherSocket) {
                        io.to(otherSocket.id).emit('messageSeen', { room, updates: payload });
                    }
                }
            }
        });

        // Sự kiện xóa nhóm mới

        socket.on('deleteGroup', async (groupId) => {
            const group = await Group.findOne({ id: groupId });
            if (group && group.creator === socket.username) {
                const members = group.members;
                await Group.deleteOne({ id: groupId });
                await Message.deleteMany({ room: groupId, isGroup: true });

                members.forEach(member => {
                    updateGroupsForUser(member);
                });
                groups = groups.filter(g => g.id !== groupId);
                io.emit('groupDeleted', groupId);
            } else {
                socket.emit('error', { message: 'Bạn không có quyền xóa nhóm này.' });
                console.log('Bạn không có quyền xóa nhóm này.');
            }
        });

        // Sự kiện thêm thành viên vào nhóm
        socket.on('addMemberToGroup', async ({ groupId, newMember }) => {
            const group = await Group.findOne({ id: groupId });
            if (group && !group.members.includes(newMember)) {
                group.members.push(newMember);
                await group.save();

                //update cache group
                const updatedGroup = await Group.findOne({ id: groupId }).lean();
                const index = groups.findIndex(g => g.id === groupId);
                if (index !== -1) {
                    groups[index] = updatedGroup;
                } else {
                    groups.push(updatedGroup);
                }

                updateGroupsForUser(newMember);
                const memberSocket = users.find(u => u.username === newMember);
                if (memberSocket) {
                    const memberSock = io.sockets.sockets.get(memberSocket.id);
                    if (memberSock) {
                        memberSock.join(groupId);
                        console.log(`${newMember} joined group ${group.id}`);
                        console.log(`${newMember} joined group ${group.members}`);
                    } else {
                        console.log(`Socket for ${newMember} not found`);
                    }
                } else {
                    console.log(`User ${newMember} is not online`);
                }


                const oldMembers = group.members.filter(m => m !== newMember);
                oldMembers.forEach(member => updateGroupsForUser(member));

                const systemMessage = new Message({
                    room: groupId,
                    user: 'Hệ thống',
                    text: `${newMember} đã được thêm vào nhóm bởi ${socket.username}.`,
                    isGroup: true,
                });
                await systemMessage.save();
                io.to(groupId).emit('message', systemMessage);
            }
        });

        // Sự kiện kick thành viên khỏi nhóm
        socket.on('kickMemberFromGroup', async ({ groupId, memberToKick }) => {
            const group = await Group.findOne({ id: groupId });
            if (group && group.members.includes(memberToKick) && group.creator === socket.username) {
                group.members = group.members.filter(member => member !== memberToKick);
                await group.save();

                //update cache group
                const updatedGroup = await Group.findOne({ id: groupId }).lean();
                const index = groups.findIndex(g => g.id === groupId);
                if (index !== -1) {
                    groups[index] = updatedGroup;
                } else {
                    groups.push(updatedGroup);
                }

                updateGroupsForUser(memberToKick);
                const remainingMembers = group.members;
                remainingMembers.forEach(member => updateGroupsForUser(member));

                const systemMessage = new Message({
                    room: groupId,
                    user: 'Hệ thống',
                    text: `${memberToKick} đã bị kick khỏi nhóm bởi ${socket.username}.`,
                    isGroup: true,
                });
                await systemMessage.save();
                io.to(groupId).emit('message', systemMessage);
            }
        });

        socket.on('disconnect', () => {
            // ...
            if (socket.username) {
                users = users.filter((u) => u.username !== socket.username);
                io.emit('users', users);
                console.log(`${socket.username} disconnected`);
            }
        });
    });
};