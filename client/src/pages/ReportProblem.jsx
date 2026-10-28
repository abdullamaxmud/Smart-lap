import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Monitor, HelpCircle, HardDrive, Cpu, Wifi, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useUniversityData } from '../hooks/useUniversityData';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/ui';
import { PRIORITIES, errorMessage, idOf } from '../utils/format';

const categories = [
    { name: 'Hardware', icon: <Cpu size={20} />, hint: 'Monitor, keyboard, mouse, PC' },
    { name: 'Software', icon: <HardDrive size={20} />, hint: 'Apps, OS, licenses' },
    { name: 'Network', icon: <Wifi size={20} />, hint: 'Internet, cables, Wi-Fi' },
    { name: 'Power', icon: <Zap size={20} />, hint: 'Sockets, UPS, shutdowns' },
    { name: 'Other', icon: <HelpCircle size={20} />, hint: 'Anything else' }
];

const ReportProblem = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { faculties, departmentsOf, fetchLabs } = useUniversityData();

    const emptyForm = {
        faculty: idOf(user?.faculty),
        department: idOf(user?.department),
        lab: '',
        computerNumber: '',
        category: 'Hardware',
        priority: 'Medium',
        description: ''
    };

    const [labs, setLabs] = useState([]);
    const [labsLoading, setLabsLoading] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let active = true;
        if (formData.faculty && formData.department) {
            setLabsLoading(true);
            fetchLabs(formData.faculty, formData.department).then((data) => {
                if (active) {
                    setLabs(data);
                    setLabsLoading(false);
                }
            });
        } else {
            setLabs([]);
        }
        return () => {
            active = false;
        };
    }, [formData.faculty, formData.department, fetchLabs]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'faculty') {
            setFormData((prev) => ({ ...prev, faculty: value, department: '', lab: '' }));
            return;
        }
        if (name === 'department') {
            setFormData((prev) => ({ ...prev, department: value, lab: '' }));
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/api/reports', formData);
            toast.success('Problem reported successfully! A technician will be assigned soon.');
            navigate('/my-reports');
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to report problem'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar title="Report a Problem" subtitle="Tell us what is wrong and where" />

            <div className="p-4 sm:p-8 max-w-4xl mx-auto">
                <div className="card">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-hu-blue text-white rounded-xl shadow-md">
                            <Monitor size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold heading-font">Lab Problem Report Form</h3>
                            <p className="text-slate-500 text-sm">Accurate details help technicians fix it faster</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="Faculty">
                                <select name="faculty" required className="input-field" value={formData.faculty} onChange={handleChange}>
                                    <option value="">Select Faculty</option>
                                    {faculties.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                                </select>
                            </Field>

                            <Field label="Department">
                                <select name="department" required className="input-field" value={formData.department} onChange={handleChange} disabled={!formData.faculty}>
                                    <option value="">Select Department</option>
                                    {departmentsOf(formData.faculty).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </Field>

                            <div className="space-y-1.5">
                                <Field label="Lab">
                                    <select name="lab" required className="input-field" value={formData.lab} onChange={handleChange} disabled={!formData.department || labsLoading}>
                                        <option value="">{labsLoading ? 'Loading labs...' : 'Select Lab'}</option>
                                        {labs.map((l) => (
                                            <option key={l._id} value={l._id}>{l.name}{l.location ? ` — ${l.location}` : ''}</option>
                                        ))}
                                    </select>
                                </Field>
                                {formData.department && !labsLoading && labs.length === 0 && (
                                    <p className="text-xs text-amber-700">
                                        No labs are registered for this department yet.{' '}
                                        {user?.role === 'super_admin'
                                            ? <Link to="/lab-config" className="font-semibold underline">Add one in Lab Config.</Link>
                                            : 'Please contact the IT office.'}
                                    </p>
                                )}
                            </div>

                            <Field label="Computer Number">
                                <input
                                    name="computerNumber"
                                    type="text"
                                    required
                                    maxLength={50}
                                    className="input-field"
                                    placeholder="e.g. CSA-12"
                                    value={formData.computerNumber}
                                    onChange={handleChange}
                                />
                            </Field>
                        </div>

                        <div className="space-y-2">
                            <span className="text-sm font-semibold text-slate-700">Problem Category</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3" role="radiogroup">
                                {categories.map((cat) => (
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={formData.category === cat.name}
                                        key={cat.name}
                                        onClick={() => setFormData((prev) => ({ ...prev, category: cat.name }))}
                                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all text-center
                                            ${formData.category === cat.name
                                                ? 'border-hu-blue bg-blue-50 text-hu-blue'
                                                : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                                    >
                                        {cat.icon}
                                        <span className="text-xs font-bold mt-2">{cat.name}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{cat.hint}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Field label="Urgency">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {PRIORITIES.map((p) => (
                                    <button
                                        type="button"
                                        key={p}
                                        onClick={() => setFormData((prev) => ({ ...prev, priority: p }))}
                                        className={`py-2 rounded-lg border text-sm font-semibold transition-colors ${formData.priority === p
                                            ? 'bg-hu-blue text-white border-hu-blue'
                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <Field label="Problem Description" hint={`${formData.description.length}/2000`}>
                            <textarea
                                name="description"
                                required
                                rows="5"
                                maxLength={2000}
                                className="input-field"
                                placeholder="What happens, since when, and anything you already tried..."
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </Field>

                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                            <button type="button" className="btn-secondary sm:w-40 py-3" onClick={() => setFormData(emptyForm)} disabled={isSubmitting}>
                                Clear
                            </button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-3 text-base font-bold">
                                {isSubmitting ? 'Submitting Report...' : 'Submit Problem Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportProblem;
