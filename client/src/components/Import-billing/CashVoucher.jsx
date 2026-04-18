import React from "react";
import "./CashVoucher.css";
import logo from "../../assets/images/logo.svg";

const CashVoucher = React.forwardRef(({ data, paidTo = "Rambhai" }, ref) => {
    const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    const containerNos = data?.container_nos || [];
    const count20 = containerNos.filter(c => c.size?.includes('20')).length;
    const count40 = containerNos.filter(c => (c.size?.includes('40') || c.size?.includes('45'))).length;
    
    // Slab calculation: 1500 per block of 4 for 20ft, 2500 per block of 4 for 40ft
    const slabs20 = Math.ceil(count20 / 4);
    const slabs40 = Math.ceil(count40 / 4);
    const totalAmount = (slabs20 * 1500) + (slabs40 * 2500);

    const numberToWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

        const inWords = (n) => {
            if ((n = n.toString()).length > 9) return 'overflow';
            let n_arr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!n_arr) return '';
            let str = '';
            str += (Number(n_arr[1]) !== 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + a[n_arr[1][1]]) + 'Crore ' : '';
            str += (Number(n_arr[2]) !== 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + a[n_arr[2][1]]) + 'Lakh ' : '';
            str += (Number(n_arr[3]) !== 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + a[n_arr[3][1]]) + 'Thousand ' : '';
            str += (Number(n_arr[4]) !== 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + a[n_arr[4][1]]) + 'Hundred ' : '';
            str += (Number(n_arr[5]) !== 0) ? (a[Number(n_arr[5])] || b[n_arr[5][0]] + a[n_arr[5][1]]) : '';
            return str;
        };

        if (num === 0) return 'Zero Only';
        const parts = Math.abs(Number(num)).toFixed(2).split('.');
        let words = inWords(parts[0]);
        if (parts.length > 1 && Number(parts[1]) > 0) {
            words += 'and ' + (a[Number(parts[1])] || b[parts[1][0]] + a[parts[1][1]]) + 'Paise ';
        }
        return `Rupees ${words}Only`;
    };

    const formattedAmount = Number(totalAmount).toFixed(2).split('.');

    const getContainerSummary = () => {
        const result = [];
        if (count20 > 0) result.push(`${count20} x 20'`);
        if (count40 > 0) result.push(`${count40} x 40'`);
        return result.join(', ') || 'N/A';
    };

    return (
        <div className="cash-voucher-container" ref={ref}>
            <div className="voucher-content">
                <div className="voucher-title">CASH PAYMENT VOUCHER</div>
                
                <div className="header-info">
                    <div className="logo-section">
                        <img src={logo} alt="SURAJ FORWARDERS PVT. LTD." className="voucher-logo" />
                    </div>
                    <div className="job-info">
                        <strong>Job No {data?.job_number || data?.job_no}</strong>
                    </div>
                    <div className="date-info">
                        <span>Date</span>
                        <span className="date-val">{today}</span>
                    </div>
                </div>

                <div className="company-address">
                    A-204/205, WALL STREET II, Opp. Orient Club, Ellis Bridge, Ahmedabad-380 006
                </div>

                <table className="voucher-table">
                    <thead>
                        <tr>
                            <th className="col-desc">Description</th>
                            <th className="col-code">Code No.</th>
                            <th className="col-rs">Rs.</th>
                            <th className="col-ps">Ps.</th>
                            <th className="col-dr">DR</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="desc-cell">
                                Cargo destuffing & stuffing charges A/c. <strong>{data?.importer}</strong>,
                                <br />
                                Containers: {getContainerSummary()}
                            </td>
                            <td></td>
                            <td className="amt-cell">{formattedAmount[0]}</td>
                            <td className="amt-cell">{formattedAmount[1]}</td>
                            <td></td>
                        </tr>
                        <tr className="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
                    </tbody>
                </table>

                <div className="particulars-section">
                    <div className="particulars-left">
                        <div className="particulars-label">PARTICULARS</div>
                        <div className="particulars-text">
                            <p>Being the amount paid towards cargo destuffing & stuffing charges</p>
                            <p>charges paid to <strong>{paidTo}</strong> for container delivery on behalf of</p>
                            <p><strong>{data?.importer}</strong>,</p>
                            <p className="words-amount">{numberToWords(totalAmount)}</p>
                        </div>
                    </div>
                    
                    <div className="particulars-total-rs">{formattedAmount[0]}</div>
                    <div className="particulars-total-ps">{formattedAmount[1]}</div>
                    <div className="particulars-total-dr"></div>
                </div>

                <div className="voucher-footer">
                    <div className="footer-item">Prepared by</div>
                    <div className="footer-item">Checked by</div>
                    <div className="footer-item">Authorised Signature</div>
                    <div className="footer-item sign-box-wrapper">
                        <div className="sign-box"></div>
                        <div className="sign-label">Receiver's Sign</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

CashVoucher.displayName = "CashVoucher";
export default CashVoucher;
