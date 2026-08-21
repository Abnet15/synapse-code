const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

exports.createRoom = async (req, res) => {
  try {
    const { roomId, language, content } = req.body;
    const finalRoomId = roomId ? roomId.trim().toUpperCase() : uuidv4().slice(0, 8).toUpperCase();

    const existingRoom = await Room.findOne({ roomId: finalRoomId });
    if (existingRoom) {
      return res.status(400).json({ message: 'A room with this ID already exists.' });
    }

    const room = new Room({
      roomId: finalRoomId,
      owner: req.user._id,
      language: language || 'javascript',
      content: content || '',
      collaborators: [req.user._id],
    });

    await room.save();

    return res.status(201).json({
      message: 'Room created successfully.',
      room,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create room.', error: error.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    })
      .populate('owner', 'username email')
      .sort({ updatedAt: -1 });

    return res.status(200).json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch rooms.', error: error.message });
  }
};

exports.getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    let room = await Room.findOne({ roomId: roomId.toUpperCase() })
      .populate('owner', 'username email isPro')
      .populate('collaborators', 'username email');

    if (!room) {
      // Auto-create room if accessed directly and user is authenticated
      room = new Room({
        roomId: roomId.toUpperCase(),
        owner: req.user._id,
        language: 'javascript',
        content: '',
        collaborators: [req.user._id],
      });
      await room.save();
      await room.populate('owner', 'username email isPro');
    } else {
      // Add user to collaborators if not present
      if (req.user && !room.collaborators.some((c) => c._id.toString() === req.user._id.toString())) {
        room.collaborators.push(req.user._id);
        await room.save();
      }
    }

    return res.status(200).json({ room });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch room details.', error: error.message });
  }
};

exports.saveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, language } = req.body;

    const room = await Room.findOne({ roomId: roomId.toUpperCase() });
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (content !== undefined) room.content = content;
    if (language !== undefined) room.language = language;

    await room.save();

    return res.status(200).json({ message: 'Room saved successfully.', room });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save room.', error: error.message });
  }
};
