const mongoose = require('mongoose');

const STATUSES = ['Pending', 'In Progress', 'Resolved'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Power', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const problemReportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
    lab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        required: [true, 'Please select a lab']
    },
    computerNumber: {
        type: String,
        required: [true, 'Please add a computer number'],
        trim: true,
        maxlength: [50, 'Computer number cannot exceed 50 characters']
    },
    category: {
        type: String,
        enum: CATEGORIES,
        required: [true, 'Please select a category']
    },
    priority: {
        type: String,
        enum: PRIORITIES,
        default: 'Medium'
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
        type: String,
        enum: STATUSES,
        default: 'Pending'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Technician or Admin
    },
    resolutionNotes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    adminNotes: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    resolvedAt: Date
}, {
    timestamps: true
});

problemReportSchema.index({ status: 1, createdAt: -1 });
problemReportSchema.index({ user: 1, createdAt: -1 });
problemReportSchema.index({ assignedTo: 1 });

problemReportSchema.statics.STATUSES = STATUSES;
problemReportSchema.statics.CATEGORIES = CATEGORIES;
problemReportSchema.statics.PRIORITIES = PRIORITIES;

module.exports = mongoose.model('ProblemReport', problemReportSchema);
