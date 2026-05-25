import React from 'react';
import { filterByTime, months } from './reports-helper';

const FinePenaltyReport = ({
    data,
    type, // 'fine' or 'penalty'
    filterType,
    dateRange,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    selectedDay
}) => {
    // 1. All Jobs in the selected period (Total Filed)
    const allJobsInPeriod = filterByTime(data, filterType, dateRange, selectedMonth, selectedYear, selectedQuarter, selectedDay);
    const totalFiled = allJobsInPeriod.length;

    // 2. Jobs with Fines/Penalties in the selected period
    const relevantJobsInPeriod = allJobsInPeriod.filter(item => {
        const val = type === 'fine'
            ? (item.fine_val !== undefined ? item.fine_val : (parseFloat(item.fine_amount?.toString().replace(/[^0-9.]/g, '') || 0)))
            : (item.penalty_val !== undefined ? item.penalty_val : (parseFloat(item.penalty_amount?.toString().replace(/[^0-9.]/g, '') || 0)));
        return val > 0;
    });

    const affectedCount = relevantJobsInPeriod.length;
    const percentage = totalFiled > 0 ? ((affectedCount / totalFiled) * 100).toFixed(1) : 0;

    // 3. Total Amount Calculation
    const totalAmount = relevantJobsInPeriod.reduce((sum, item) => {
        const val = type === 'fine'
            ? (item.fine_val !== undefined ? item.fine_val : (parseFloat(item.fine_amount?.toString().replace(/[^0-9.]/g, '') || 0)))
            : (item.penalty_val !== undefined ? item.penalty_val : (parseFloat(item.penalty_amount?.toString().replace(/[^0-9.]/g, '') || 0)));
        return sum + val;
    }, 0);

    // Format Currency
    const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(totalAmount);

    // Construct Time Period Text
    let periodText = "all time";
    if (filterType === 'month') {
        periodText = `in ${months[selectedMonth]} ${selectedYear}`;
    } else if (filterType === 'quarter') {
        periodText = `in Q${selectedQuarter} ${selectedYear}`;
    } else if (filterType === 'year') {
        periodText = `in ${selectedYear}`;
    } else if (filterType === 'date-range' && dateRange.start) {
        periodText = `from ${dateRange.start} to ${dateRange.end || 'today'}`;
    } else if (filterType === 'day' && selectedDay) {
        periodText = `on ${selectedDay}`;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="nucleus-stats-card">
                <div className="stats-text">
                    In <span className="highlight-text">{periodText}</span>, we filed <span className="highlight-val">{totalFiled}</span> Bills of Entry, out of which <span className="highlight-val">{affectedCount}</span> had {type === 'fine' ? 'fines' : 'penalties'} (<span className="highlight-val">{percentage}%</span>).
                    Total {type === 'fine' ? 'Fine' : 'Penalty'} Amount: <span className="highlight-val" style={{ color: type === 'fine' ? '#d97706' : '#dc2626' }}>{formattedAmount}</span>
                </div>
            </div>

            <div className="nucleus-table-wrapper">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th>Job No</th>
                            <th>BE No</th>
                            <th>BE Date</th>
                            <th>{type === 'fine' ? 'Fine Amount (INR)' : 'Penalty Amount (INR)'}</th>
                            <th>Accountability</th>
                            <th>Importer</th>
                            <th>Handler Name(s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {relevantJobsInPeriod.length > 0 ? (
                            relevantJobsInPeriod.map((item) => (
                                <tr key={item._id}>
                                    <td style={{ fontWeight: 500 }}>{item.job_no}</td>
                                    <td>{item.be_no}</td>
                                    <td>{item.be_date}</td>
                                    <td className={`amount-cell ${type === 'fine' ? 'fine-amount' : 'penalty-amount'}`}>
                                        {type === 'fine' ? item.fine_amount : item.penalty_amount}
                                    </td>
                                    <td>
                                        {item.penalty_by_us ? (
                                            <span style={{ color: '#d97706', fontWeight: 600 }}>Agency</span>
                                        ) : item.penalty_by_importer ? (
                                            <span style={{ color: '#2563eb', fontWeight: 600 }}>Importer</span>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>-</span>
                                        )}
                                    </td>
                                    <td>{item.importer}</td>
                                    <td>
                                        {item.handlers && item.handlers.length > 0 ? (
                                            item.handlers.map((h, i) => (
                                                <span key={i} className="handler-tag">{h}</span>
                                            ))
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                    No records found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinePenaltyReport;
