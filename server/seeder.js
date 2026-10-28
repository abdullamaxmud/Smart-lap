require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const Lab = require('./models/Lab');
const ProblemReport = require('./models/ProblemReport');
const ActivityLog = require('./models/ActivityLog');

// Usage:
//   node seeder.js            -> wipe and seed university structure, default users and sample reports
//   node seeder.js --no-demo  -> same, without the sample reports
//   node seeder.js --destroy  -> wipe all data
const args = process.argv.slice(2);

const daysAgo = (n, hours = 0) => new Date(Date.now() - n * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000);

const wipe = async () => {
    await Promise.all([
        ProblemReport.deleteMany(),
        ActivityLog.deleteMany(),
        Lab.deleteMany(),
        Department.deleteMany(),
        Faculty.deleteMany(),
        User.deleteMany()
    ]);
};

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        await wipe();
        if (args.includes('--destroy')) {
            console.log('All data destroyed.');
            process.exit();
        }

        await Promise.all([Faculty.syncIndexes(), Department.syncIndexes(), User.syncIndexes()]);

        const faculties = await Faculty.insertMany([
            { name: 'Faculty of Computer Science & IT', description: 'Computing, software and information systems' },
            { name: 'Faculty of Engineering', description: 'Electrical, network and civil engineering' },
            { name: 'Faculty of Business Administration', description: 'Management, accounting and finance' },
            { name: 'Faculty of Health Sciences', description: 'Medicine, nursing and public health' }
        ]);
        console.log('Faculties seeded!');

        const departments = await Department.insertMany([
            { name: 'Computer Science', faculty: faculties[0]._id },
            { name: 'Information Technology', faculty: faculties[0]._id },
            { name: 'Software Engineering', faculty: faculties[0]._id },
            { name: 'Network Engineering', faculty: faculties[1]._id },
            { name: 'Electrical Engineering', faculty: faculties[1]._id },
            { name: 'Business Management', faculty: faculties[2]._id },
            { name: 'Public Health', faculty: faculties[3]._id }
        ]);
        console.log('Departments seeded!');

        const labs = await Lab.insertMany([
            { name: 'CS Lab A', faculty: faculties[0]._id, department: departments[0]._id, location: 'Block A - Floor 1', capacity: 40 },
            { name: 'IT Networking Lab', faculty: faculties[0]._id, department: departments[1]._id, location: 'Block A - Floor 2', capacity: 30 },
            { name: 'Software Studio', faculty: faculties[0]._id, department: departments[2]._id, location: 'Block A - Floor 3', capacity: 35 },
            { name: 'Engineering Systems Lab', faculty: faculties[1]._id, department: departments[3]._id, location: 'Block B - Floor 1', capacity: 25 },
            { name: 'Business Computer Lab', faculty: faculties[2]._id, department: departments[5]._id, location: 'Block C - Floor 1', capacity: 45 }
        ]);
        console.log('Labs seeded!');

        // create() (not insertMany) so the password hashing middleware runs
        const superAdmin = await User.create({ name: 'Super Admin', email: 'admin@hu.edu.so', password: 'password123', role: 'super_admin' });
        const labAdmin = await User.create({ name: 'Lab Admin', email: 'labadmin@hu.edu.so', password: 'password123', role: 'admin', faculty: faculties[0]._id });
        const tech = await User.create({ name: 'Tech Support', email: 'tech@hu.edu.so', password: 'password123', role: 'technician' });
        const tech2 = await User.create({ name: 'Network Technician', email: 'tech2@hu.edu.so', password: 'password123', role: 'technician' });
        const student = await User.create({
            name: 'Test Student',
            email: 'student@hu.edu.so',
            password: 'password123',
            role: 'user',
            faculty: faculties[0]._id,
            department: departments[0]._id
        });
        console.log('Default users seeded!');

        if (!args.includes('--no-demo')) {
            const report = (lab, extra) => ({
                user: student._id,
                faculty: lab.faculty,
                department: lab.department,
                lab: lab._id,
                updatedAt: extra.resolvedAt || extra.createdAt,
                ...extra
            });

            const reports = [
                report(labs[0], { computerNumber: 'CSA-04', category: 'Hardware', priority: 'High', description: 'Monitor flickers and turns off after a few minutes.', status: 'Pending', createdAt: daysAgo(0, 3) }),
                report(labs[0], { computerNumber: 'CSA-11', category: 'Software', priority: 'Medium', description: 'Visual Studio Code crashes on launch.', status: 'In Progress', assignedTo: tech._id, adminNotes: 'Reinstalling the application.', createdAt: daysAgo(1) }),
                report(labs[1], { computerNumber: 'NET-02', category: 'Network', priority: 'Critical', description: 'No internet connection on the whole second row.', status: 'In Progress', assignedTo: tech2._id, createdAt: daysAgo(2) }),
                report(labs[1], { computerNumber: 'NET-09', category: 'Network', priority: 'Medium', description: 'Ethernet port is loose.', status: 'Resolved', assignedTo: tech2._id, resolutionNotes: 'Replaced the wall socket.', createdAt: daysAgo(6), resolvedAt: daysAgo(5) }),
                report(labs[2], { computerNumber: 'SS-15', category: 'Power', priority: 'High', description: 'Computer shuts down randomly; power supply suspected.', status: 'Resolved', assignedTo: tech._id, resolutionNotes: 'Power supply unit replaced.', createdAt: daysAgo(9), resolvedAt: daysAgo(8) }),
                report(labs[3], { computerNumber: 'ENG-07', category: 'Software', priority: 'Low', description: 'MATLAB license expired.', status: 'Pending', createdAt: daysAgo(3) }),
                report(labs[4], { computerNumber: 'BUS-21', category: 'Hardware', priority: 'Medium', description: 'Keyboard keys are not responding.', status: 'Resolved', assignedTo: tech._id, resolutionNotes: 'Keyboard replaced.', createdAt: daysAgo(14), resolvedAt: daysAgo(13) }),
                report(labs[0], { computerNumber: 'CSA-30', category: 'Other', priority: 'Low', description: 'Chair at this desk is broken.', status: 'Pending', createdAt: daysAgo(4) })
            ];

            await ProblemReport.insertMany(reports, { timestamps: false });
            await ActivityLog.insertMany([
                { user: superAdmin._id, action: 'SEEDED', details: 'Database initialised with default data' },
                { user: labAdmin._id, action: 'LOGIN', details: `${labAdmin.email} signed in` }
            ]);
            console.log('Sample reports seeded!');
        }

        console.log('\nSeeding complete! Default accounts (password: password123):');
        console.log('  super admin  admin@hu.edu.so');
        console.log('  admin        labadmin@hu.edu.so');
        console.log('  technician   tech@hu.edu.so, tech2@hu.edu.so');
        console.log('  user         student@hu.edu.so');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
