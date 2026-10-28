const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a faculty name'],
        unique: true,
        trim: true,
        maxlength: [120, 'Faculty name cannot exceed 120 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Faculty', facultySchema);
