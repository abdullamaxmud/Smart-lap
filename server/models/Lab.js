const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a lab name'],
        trim: true,
        maxlength: [120, 'Lab name cannot exceed 120 characters']
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: [true, 'Please select a faculty']
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Please select a department']
    },
    location: {
        type: String,
        trim: true
    },
    capacity: {
        type: Number,
        min: [0, 'Capacity cannot be negative']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lab', labSchema);
