import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import './ModalTable.css';

const ModalTable = ({ open, onClose, title, data, dateLabel, type }) => {
    const navigate = useNavigate();

    const handleRowClick = (job_no) => {
        const getFinancialYear = (dateStr) => {
            if (!dateStr) return '24-25';
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return '24-25';
                const year = d.getFullYear();
                const month = d.getMonth(); // 0-11
                const startYear = (month < 3) ? year - 1 : year;
                const endYear = startYear + 1;
                return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
            } catch (e) { return '24-25'; }
        };

        const row = data.find(r => r.job_no === job_no);
        const fy = row ? getFinancialYear(row.relevant_date) : '24-25';

        if (job_no) navigate(`/import-dsr/job/${job_no}/${fy}`, { state: { fromAnalytics: true } });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {title}
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <div className="table-responsive">
                    <table className="analytics-table">
                        <thead>
                            <tr>
                                <th>Job No</th>
                                <th>Importer</th>
                                <th>Shipping Line</th>
                                <th>{dateLabel || 'Relevant Date'}</th>
                                {type === 'be_filed' ? <th>BoE File</th> :
                                    type === 'ooc' ? <th>OOC File</th> :
                                        <th>Container</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {data && data.length > 0 ? (
                                data.map((row, index) => (
                                    <tr key={index} onClick={() => handleRowClick(row.job_no)}>
                                        <td className="clickable-job">{row.job_no}</td>
                                        <td>{row.importer}</td>
                                        <td>{row.shipping_line_airline}</td>
                                        <td>{new Date(row.relevant_date).toLocaleDateString()}</td>
                                        <td>
                                            {type === 'be_filed' ? (
                                                row.processed_be_attachment ? (
                                                    <a
                                                        href={row.processed_be_attachment}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ color: '#3b82f6', textDecoration: 'underline' }}
                                                    >
                                                        View BoE
                                                    </a>
                                                ) : '-'
                                            ) : type === 'ooc' ? (
                                                row.ooc_copies && row.ooc_copies.length > 0 ? (
                                                    <a
                                                        href={Array.isArray(row.ooc_copies) ? row.ooc_copies[0] : row.ooc_copies}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ color: '#3b82f6', textDecoration: 'underline' }}
                                                    >
                                                        View OOC
                                                    </a>
                                                ) : '-'
                                            ) : (
                                                row.container_number || '-'
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center' }}>No Data Found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ModalTable;
