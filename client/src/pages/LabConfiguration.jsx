import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Building2, Layers, Monitor, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Modal, ConfirmDialog, Field, PageLoader, EmptyState } from '../components/ui';
import { errorMessage, idOf } from '../utils/format';

const TABS = [
    { key: 'labs', label: 'Labs', icon: Monitor },
    { key: 'departments', label: 'Departments', icon: Layers },
    { key: 'faculties', label: 'Faculties', icon: Building2 }
];

const ENDPOINT = { faculties: 'faculties', departments: 'departments', labs: 'labs' };
const SINGULAR = { faculties: 'Faculty', departments: 'Department', labs: 'Lab' };

const blankFor = (kind) => ({
    faculties: { name: '', description: '' },
    departments: { name: '', faculty: '' },
    labs: { name: '', faculty: '', department: '', location: '', capacity: '' }
}[kind]);

const LabConfiguration = () => {
    const [faculties, setFaculties] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [labs, setLabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('labs');

    const [facultyFilter, setFacultyFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');

    const [editor, setEditor] = useState(null); // { kind, item|null }
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null); // { kind, item }

    const loadData = async () => {
        try {
            const [facRes, deptRes, labsRes] = await Promise.all([
                axios.get('/api/admin/faculties'),
                axios.get('/api/admin/departments'),
                axios.get('/api/admin/labs')
            ]);
            setFaculties(facRes.data.data || []);
            setDepartments(deptRes.data.data || []);
            setLabs(labsRes.data.data || []);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to load lab configuration data'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const departmentsOf = (facultyId) => departments.filter((d) => idOf(d.faculty) === facultyId);

    const counts = useMemo(() => {
        const deptByFaculty = {};
        const labsByDept = {};
        const labsByFaculty = {};
        departments.forEach((d) => {
            const f = idOf(d.faculty);
            deptByFaculty[f] = (deptByFaculty[f] || 0) + 1;
        });
        labs.forEach((l) => {
            labsByDept[idOf(l.department)] = (labsByDept[idOf(l.department)] || 0) + 1;
            labsByFaculty[idOf(l.faculty)] = (labsByFaculty[idOf(l.faculty)] || 0) + 1;
        });
        return { deptByFaculty, labsByDept, labsByFaculty };
    }, [departments, labs]);

    const visibleLabs = labs.filter(
        (lab) =>
            (!facultyFilter || idOf(lab.faculty) === facultyFilter) &&
            (!departmentFilter || idOf(lab.department) === departmentFilter)
    );
    const visibleDepartments = departments.filter((d) => !facultyFilter || idOf(d.faculty) === facultyFilter);

    const openEditor = (kind, item = null) => {
        const base = blankFor(kind);
        if (item) {
            Object.keys(base).forEach((k) => {
                base[k] = ['faculty', 'department'].includes(k) ? idOf(item[k]) : item[k] ?? '';
            });
        } else if (kind !== 'faculties' && facultyFilter) {
            base.faculty = facultyFilter;
            if (kind === 'labs' && departmentFilter) base.department = departmentFilter;
        }
        setForm(base);
        setEditor({ kind, item });
    };

    const onSave = async (e) => {
        e.preventDefault();
        const { kind, item } = editor;
        setSaving(true);
        try {
            const url = `/api/admin/${ENDPOINT[kind]}${item ? `/${item._id}` : ''}`;
            await (item ? axios.put(url, form) : axios.post(url, form));
            toast.success(`${SINGULAR[kind]} ${item ? 'updated' : 'added'}`);
            setEditor(null);
            loadData();
        } catch (err) {
            toast.error(errorMessage(err, `Failed to save ${SINGULAR[kind].toLowerCase()}`));
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async () => {
        const { kind, item } = deleting;
        setSaving(true);
        try {
            await axios.delete(`/api/admin/${ENDPOINT[kind]}/${item._id}`);
            toast.success(`${SINGULAR[kind]} deleted`);
            setDeleting(null);
            loadData();
        } catch (err) {
            toast.error(errorMessage(err, 'Delete failed'));
        } finally {
            setSaving(false);
        }
    };

    const RowActions = ({ kind, item }) => (
        <div className="flex justify-end">
            <button className="btn-icon" onClick={() => openEditor(kind, item)} aria-label="Edit"><Pencil size={16} /></button>
            <button className="btn-icon hover:text-red-600 hover:bg-red-50" onClick={() => setDeleting({ kind, item })} aria-label="Delete"><Trash2 size={16} /></button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar
                title="Lab Configuration"
                subtitle={`${faculties.length} faculties · ${departments.length} departments · ${labs.length} labs`}
                actions={
                    <button className="btn-primary" onClick={() => openEditor(tab)}>
                        <Plus size={18} /> <span className="hidden sm:inline">Add {SINGULAR[tab]}</span>
                    </button>
                }
            />

            <div className="p-4 sm:p-8 space-y-6">
                <div className="card bg-blue-50/50 border-blue-100 p-4 text-sm text-slate-600">
                    <strong className="text-slate-800">Setup order:</strong> add a Faculty → add its Departments → add Labs under a Department.
                    Students then see those labs when they report a problem. Items that are still in use cannot be deleted.
                </div>

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 self-start">
                        {TABS.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-hu-blue text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Icon size={16} /> {label}
                            </button>
                        ))}
                    </div>

                    {tab !== 'faculties' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                className="input-field text-sm sm:w-64"
                                value={facultyFilter}
                                onChange={(e) => {
                                    setFacultyFilter(e.target.value);
                                    setDepartmentFilter('');
                                }}
                            >
                                <option value="">All faculties</option>
                                {faculties.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                            </select>
                            {tab === 'labs' && (
                                <select className="input-field text-sm sm:w-56" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} disabled={!facultyFilter}>
                                    <option value="">All departments</option>
                                    {departmentsOf(facultyFilter).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            )}
                        </div>
                    )}
                </div>

                <div className="card p-0 overflow-hidden">
                    {loading ? (
                        <PageLoader />
                    ) : (
                        <div className="overflow-x-auto">
                            {tab === 'labs' && (
                                visibleLabs.length === 0 ? (
                                    <EmptyState icon={<Monitor size={28} />} title="No labs found" message="Add a lab or change the filters." />
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th className="table-head">Lab</th>
                                                <th className="table-head">Faculty</th>
                                                <th className="table-head">Department</th>
                                                <th className="table-head">Location</th>
                                                <th className="table-head">Computers</th>
                                                <th className="table-head text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {visibleLabs.map((lab) => (
                                                <tr key={lab._id} className="hover:bg-slate-50">
                                                    <td className="table-cell font-semibold text-slate-800">{lab.name}</td>
                                                    <td className="table-cell">{lab.faculty?.name || '-'}</td>
                                                    <td className="table-cell">{lab.department?.name || '-'}</td>
                                                    <td className="table-cell">
                                                        {lab.location ? <span className="flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{lab.location}</span> : '-'}
                                                    </td>
                                                    <td className="table-cell">{lab.capacity ?? '-'}</td>
                                                    <td className="table-cell"><RowActions kind="labs" item={lab} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            )}

                            {tab === 'departments' && (
                                visibleDepartments.length === 0 ? (
                                    <EmptyState icon={<Layers size={28} />} title="No departments found" message="Add a department to a faculty." />
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th className="table-head">Department</th>
                                                <th className="table-head">Faculty</th>
                                                <th className="table-head">Labs</th>
                                                <th className="table-head text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {visibleDepartments.map((d) => (
                                                <tr key={d._id} className="hover:bg-slate-50">
                                                    <td className="table-cell font-semibold text-slate-800">{d.name}</td>
                                                    <td className="table-cell">{d.faculty?.name || '-'}</td>
                                                    <td className="table-cell">{counts.labsByDept[d._id] || 0}</td>
                                                    <td className="table-cell"><RowActions kind="departments" item={d} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            )}

                            {tab === 'faculties' && (
                                faculties.length === 0 ? (
                                    <EmptyState icon={<Building2 size={28} />} title="No faculties yet" message="Start by adding a faculty." />
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th className="table-head">Faculty</th>
                                                <th className="table-head">Description</th>
                                                <th className="table-head">Departments</th>
                                                <th className="table-head">Labs</th>
                                                <th className="table-head text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {faculties.map((f) => (
                                                <tr key={f._id} className="hover:bg-slate-50">
                                                    <td className="table-cell font-semibold text-slate-800">{f.name}</td>
                                                    <td className="table-cell text-slate-500 max-w-sm">{f.description || '-'}</td>
                                                    <td className="table-cell">{counts.deptByFaculty[f._id] || 0}</td>
                                                    <td className="table-cell">{counts.labsByFaculty[f._id] || 0}</td>
                                                    <td className="table-cell"><RowActions kind="faculties" item={f} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Modal
                open={!!editor}
                onClose={() => setEditor(null)}
                title={editor ? `${editor.item ? 'Edit' : 'Add'} ${SINGULAR[editor.kind]}` : ''}
            >
                {editor && (
                    <form onSubmit={onSave} className="p-6 space-y-4">
                        <Field label={`${SINGULAR[editor.kind]} Name`}>
                            <input className="input-field" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                        </Field>

                        {editor.kind === 'faculties' && (
                            <Field label="Description (optional)">
                                <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                            </Field>
                        )}

                        {editor.kind !== 'faculties' && (
                            <Field label="Faculty">
                                <select
                                    className="input-field"
                                    required
                                    value={form.faculty}
                                    onChange={(e) => setForm((p) => ({ ...p, faculty: e.target.value, ...(editor.kind === 'labs' ? { department: '' } : {}) }))}
                                >
                                    <option value="">Select faculty</option>
                                    {faculties.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                                </select>
                            </Field>
                        )}

                        {editor.kind === 'labs' && (
                            <>
                                <Field label="Department">
                                    <select className="input-field" required disabled={!form.faculty} value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
                                        <option value="">Select department</option>
                                        {departmentsOf(form.faculty).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                    </select>
                                </Field>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Location (optional)">
                                        <input className="input-field" placeholder="Block A - Floor 1" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                                    </Field>
                                    <Field label="Number of computers">
                                        <input className="input-field" type="number" min={0} value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} />
                                    </Field>
                                </div>
                            </>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" className="btn-secondary flex-1" onClick={() => setEditor(null)}>Cancel</button>
                            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                        </div>
                    </form>
                )}
            </Modal>

            <ConfirmDialog
                open={!!deleting}
                title={deleting ? `Delete ${SINGULAR[deleting.kind].toLowerCase()}?` : ''}
                message={deleting ? `"${deleting.item.name}" will be permanently deleted.` : ''}
                busy={saving}
                onConfirm={onDelete}
                onCancel={() => setDeleting(null)}
            />
        </div>
    );
};

export default LabConfiguration;
