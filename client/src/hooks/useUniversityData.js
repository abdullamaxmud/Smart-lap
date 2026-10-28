import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useUniversityData = () => {
    const [faculties, setFaculties] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [labs, setLabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                const [facRes, deptRes] = await Promise.all([
                    axios.get('/api/admin/faculties'),
                    axios.get('/api/admin/departments')
                ]);
                if (cancelled) return;
                setFaculties(facRes.data.data);
                setDepartments(deptRes.data.data);
            } catch (err) {
                if (!cancelled) setError('Could not load faculties and departments');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchLabs = useCallback(async (facultyId, departmentId) => {
        try {
            const params = {};
            if (facultyId) params.faculty = facultyId;
            if (departmentId) params.department = departmentId;
            const res = await axios.get('/api/admin/labs', { params });
            setLabs(res.data.data);
            return res.data.data;
        } catch (err) {
            return [];
        }
    }, []);

    const departmentsOf = useCallback(
        (facultyId) => departments.filter((d) => (d.faculty?._id || d.faculty) === facultyId),
        [departments]
    );

    return { faculties, departments, labs, loading, error, fetchLabs, departmentsOf };
};
