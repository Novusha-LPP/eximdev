import React from 'react';
import FileUpload from '../gallery/FileUpload';
import ImagePreview from '../gallery/ImagePreview';

export default function TrackingStatusSection({
  formik, user, isSubmissionDate, ExBondflag, 
  handleBlStatusChange, resetOtherDetails, handleDateChange,
  formatDateTime, handleGenerate, handleOpenDutyModal, isDutyPaidDateDisabled,
  canChangeClearance, filteredClearanceOptions, jobDetails, beTypeOptions,
  importTerms, handleImportTermsChange, options, data
}) {
  
  const handleSave = () => formik.handleSubmit();
  const handleReset = () => formik.resetForm();
  const handleExport = () => {
    const dataStr = JSON.stringify(formik.values, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tracking_status.json';
    link.click();
  };

  // Compact Global Styles
  const containerStyle = { padding: '15px', backgroundColor: '#f9f9f9', minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: '13px' };
  const sectionTitleStyle = { fontSize: '15px', fontWeight: 'bold', color: '#333', marginBottom: '12px', borderBottom: '1px solid #ddd', paddingBottom: '8px' };
  const rowStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '10px' };
  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '3px' };
  const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#666' };
  const inputStyle = { padding: '5px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box', fontFamily: 'Arial' };
  const selectStyle = { ...inputStyle };
  const radioLabelStyle = { display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 8px 2px 0', fontSize: '12px', cursor: 'pointer' };
  const radioInputStyle = { width: '14px', height: '14px', cursor: 'pointer', margin: 0 };
  const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', margin: 0 };
  const checkboxInputStyle = { width: '14px', height: '14px', cursor: 'pointer', margin: 0 };
  const buttonStyle = { padding: '6px 12px', fontSize: '12px', border: '1px solid #007bff', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#007bff', color: 'white' };
  const secondaryButtonStyle = { ...buttonStyle, backgroundColor: '#6c757d', borderColor: '#6c757d' };
  const successButtonStyle = { ...buttonStyle, backgroundColor: '#28a745', borderColor: '#28a745' };

  return (
    <div className="job-details-container" style={containerStyle}>
      <h2 style={sectionTitleStyle}>Tracking Status</h2>

      {/* Row 1: BL, BL Date, HAWBL, HAWBL Date */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>BL No:</label>
          <input type="text" style={inputStyle} value={formik.values.awb_bl_no || ''} onChange={(e) => formik.setFieldValue('awb_bl_no', e.target.value)} placeholder="Enter BL No" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>BL Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.awb_bl_date || ''} onChange={(e) => formik.setFieldValue('awb_bl_date', e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>HAWBL No:</label>
          <input type="text" style={inputStyle} value={formik.values.hawb_hbl_no || ''} onChange={(e) => formik.setFieldValue('hawb_hbl_no', e.target.value)} placeholder="Enter HAWBL No" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>HAWBL Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.hawb_hbl_date || ''} onChange={(e) => formik.setFieldValue('hawb_hbl_date', e.target.value)} />
        </div>
      </div>

      {/* Row 2: ETA, G-IGM, G-IGM Date, IGM */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>ETA Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.vessel_berthing || ''} onChange={(e) => formik.setFieldValue('vessel_berthing', e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>G-IGM No:</label>
          <input type="text" style={inputStyle} value={formik.values.gateway_igm || ''} onChange={(e) => formik.setFieldValue('gateway_igm', e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>G-IGM Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.gateway_igm_date || ''} onChange={(e) => formik.setFieldValue('gateway_igm_date', e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>IGM No:</label>
          <input type="text" style={inputStyle} value={formik.values.igm_no || ''} onChange={(e) => formik.setFieldValue('igm_no', e.target.value)} />
        </div>
      </div>

      {/* Row 3: IGM Date, Discharge, Line No, No Of Packages */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>IGM Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.igm_date || ''} onChange={(e) => formik.setFieldValue('igm_date', e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Discharge Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.discharge_date || ''} onChange={(e) => formik.setFieldValue('discharge_date', e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Line No:</label>
          <input type="text" style={inputStyle} value={formik.values.line_no || ''} onChange={(e) => formik.setFieldValue('line_no', e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>No Of Packages:</label>
          <input type="number" style={inputStyle} value={formik.values.no_of_pkgs || ''} onChange={(e) => formik.setFieldValue('no_of_pkgs', e.target.value)} />
        </div>
      </div>

      {/* Row 4: HSS, Seller (conditional), AD Code, Bank Name, Free Time (if not LCL) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '10px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>HSS:</label>
          <select style={selectStyle} value={formik.values.hss || 'No'} onChange={(e) => formik.setFieldValue('hss', e.target.value)}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {formik.values.hss === 'Yes' && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Seller Name:</label>
            <input type="text" style={inputStyle} value={formik.values.saller_name || ''} onChange={(e) => formik.setFieldValue('saller_name', e.target.value)} placeholder="Enter Seller Name" />
          </div>
        )}

        <div style={fieldStyle}>
          <label style={labelStyle}>AD Code:</label>
          <input type="text" style={inputStyle} value={formik.values.adCode || ''} onChange={(e) => formik.setFieldValue('adCode', e.target.value)} placeholder="Enter AD Code" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Bank Name:</label>
          <input type="text" style={inputStyle} value={formik.values.bank_name || ''} onChange={(e) => formik.setFieldValue('bank_name', e.target.value)} placeholder="Enter Bank Name" />
        </div>

        {formik.values.consignment_type !== "LCL" && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Free Time:</label>
            <select style={selectStyle} value={formik.values.free_time || ''} onChange={(e) => formik.setFieldValue('free_time', e.target.value)}>
              <option value="">Select Free Time</option>
              {options?.map((option, idx) => <option key={idx} value={option}>{option}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Terms of Invoice - HORIZONTAL RADIO BUTTONS */}
      <div style={{ marginBottom: '10px', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', alignItems: 'flex-start' }}>
        <label style={{ ...labelStyle, marginTop: '2px' }}>Terms of Invoice</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '12px', alignItems: 'flex-start' }}>
          {/* Radio Options - HORIZONTAL */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Terms:</span>
            {['CIF', 'FOB', 'C&F', 'C&I'].map(term => (
              <label key={term} style={{ ...radioLabelStyle, margin: 0 }}>
                <input type="radio" name="import_terms" value={term} checked={(formik.values.import_terms || importTerms) === term} onChange={() => handleImportTermsChange({ target: { value: term } })} style={radioInputStyle} />
                {term}
              </label>
            ))}
          </div>

          {/* CIF Value */}
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: '11px' }}>{(formik.values.import_terms || importTerms)} Value:</label>
            <input type="number" style={inputStyle} value={formik.values.cifValue || ''} onChange={(e) => formik.setFieldValue('cifValue', e.target.value)} placeholder="₹" />
          </div>

          {/* Freight */}
          {((formik.values.import_terms || importTerms) === 'FOB' || (formik.values.import_terms || importTerms) === 'C&I') && (
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, fontSize: '11px' }}>Freight:</label>
              <input type="number" style={inputStyle} value={formik.values.freight || ''} onChange={(e) => formik.setFieldValue('freight', e.target.value)} placeholder="₹" />
            </div>
          )}

          {/* Insurance */}
          {((formik.values.import_terms || importTerms) === 'FOB' || (formik.values.import_terms || importTerms) === 'C&F') && (
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, fontSize: '11px' }}>Insurance:</label>
              <input type="number" style={inputStyle} value={formik.values.insurance || ''} onChange={(e) => formik.setFieldValue('insurance', e.target.value)} placeholder="₹" />
            </div>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div style={{ marginBottom: '10px', marginLeft: '80px', fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
        {(formik.values.import_terms || importTerms) === 'CIF' && 'Cost, Insurance & Freight included'}
        {(formik.values.import_terms || importTerms) === 'FOB' && 'Add freight & insurance'}
        {(formik.values.import_terms || importTerms) === 'CF' && 'Add insurance'}
        {(formik.values.import_terms || importTerms) === 'CI' && 'Add freight'}
      </div>

      {/* Row 5: Priority, Payment Method, FTA, Description, CTH, BOE Type */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Priority:</label>
          <div style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
            {['Normal', 'Priority', 'High'].map(p => (
              <label key={p} style={{ ...radioLabelStyle, margin: 0 }}>
                <input type="radio" name="priorityJob" value={p === 'High' ? 'High Priority' : p} checked={formik.values.priorityJob === (p === 'High' ? 'High Priority' : p)} onChange={() => formik.setFieldValue('priorityJob', p === 'High' ? 'High Priority' : p)} style={radioInputStyle} />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Payment Method:</label>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            {['Transaction', 'Deferred'].map(m => (
              <label key={m} style={{ ...radioLabelStyle, margin: 0 }}>
                <input type="radio" name="payment_method" value={m} checked={formik.values.payment_method === m} onChange={() => formik.setFieldValue('payment_method', m)} style={radioInputStyle} />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>FTA Benefit:</label>
          <select style={selectStyle} value={formik.values.fta_Benefit_date_time ? 'Yes' : 'No FTA'} onChange={(e) => { if (e.target.value === 'Yes') formik.setFieldValue('fta_Benefit_date_time', new Date().toISOString().slice(0, 16)); else formik.setFieldValue('fta_Benefit_date_time', ''); }}>
            <option value="No FTA">No FTA</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description:</label>
          <input type="text" style={inputStyle} value={formik.values.description || ''} onChange={(e) => formik.setFieldValue('description', e.target.value)} placeholder="Enter description" />
        </div>
      </div>

      {/* Row 6: CTH, BOE Type, Clearance, Gross Weight */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>CTH No:</label>
          <input type="text" style={inputStyle} value={formik.values.cth_no || ''} onChange={(e) => formik.setFieldValue('cth_no', e.target.value)} placeholder="Enter CTH No" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>BOE Type:</label>
          <select style={selectStyle} value={formik.values.type_of_b_e || ''} onChange={(e) => formik.setFieldValue('type_of_b_e', e.target.value)}>
            <option value="">Select Type</option>
            {beTypeOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Clearance Under:</label>
          <select style={selectStyle} value={formik.values.clearanceValue || ''} onChange={(e) => formik.setFieldValue('clearanceValue', e.target.value)}>
            <option value="">Select Clearance Type</option>
            {filteredClearanceOptions?.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {ExBondflag && (
          <div style={fieldStyle}>
            <label style={labelStyle}>In Bond:</label>
            <select style={selectStyle} value={formik.values.exBondValue || ''} onChange={(e) => formik.setFieldValue('exBondValue', e.target.value)}>
              <option value="">Select In-Bond Type</option>
              <option value="other">Other</option>
              {jobDetails?.map(job => <option key={job.job_no} value={job.job_no}>{job.job_no}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Row 7: Gross Weight, Net Weight, BOE NO, BOE Date */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Gross Weight (KGS):</label>
          <input type="number" style={inputStyle} value={formik.values.gross_weight || ''} onChange={(e) => formik.setFieldValue('gross_weight', e.target.value)} placeholder="Enter gross weight" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Net Weight (KGS):</label>
          <input type="number" style={inputStyle} value={formik.values.job_net_weight || ''} onChange={(e) => formik.setFieldValue('job_net_weight', e.target.value)} placeholder="Enter net weight" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>BOE NO:</label>
          <input type="text" style={inputStyle} value={formik.values.be_no || ''} onChange={(e) => formik.setFieldValue('be_no', e.target.value)} placeholder="Enter BOE NO" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>BOE Date:</label>
          <input type="date" style={inputStyle} value={formik.values.be_date || ''} onChange={(e) => formik.setFieldValue('be_date', e.target.value)} />
        </div>
      </div>

      {/* Row 8: Assessment, PCV, Duty Paid, Out of Charge */}
      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Assessment Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.assessment_date || ''} onChange={(e) => formik.setFieldValue('assessment_date', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>PCV Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.pcv_date || ''} onChange={(e) => formik.setFieldValue('pcv_date', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Duty Paid Date:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.duty_paid_date || ''} onChange={(e) => formik.setFieldValue('duty_paid_date', e.target.value)} disabled={isDutyPaidDateDisabled} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Out of Charge:</label>
          <input type="datetime-local" style={inputStyle} value={formik.values.out_of_charge || ''} onChange={(e) => formik.setFieldValue('out_of_charge', e.target.value)} />
        </div>
      </div>

      {/* Row 9: BOE Filing - HORIZONTAL */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
        <label style={labelStyle}>BOE Filing:</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Discharge', 'Railout', 'Advanced', 'Prior'].map(filing => (
            <label key={filing} style={{ ...radioLabelStyle, margin: 0 }}>
              <input type="radio" name="be_filing_type" value={filing} checked={formik.values.be_filing_type === filing} onChange={() => formik.setFieldValue('be_filing_type', filing)} style={radioInputStyle} />
              {filing}
            </label>
          ))}
        </div>
      </div>

      {/* File Uploads - 3 Column */}
      <h3 style={{ ...sectionTitleStyle, marginTop: '15px' }}>File Uploads</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '10px' }}>
        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: '5px' }}>Checklist:</label>
          <FileUpload label="Upload Checklist" bucketPath="checklist" onFilesUploaded={(f) => formik.setFieldValue('checklist', f)} singleFileOnly={true} />
          <ImagePreview images={formik.values.checklist || []} onDeleteImage={() => formik.setFieldValue('checklist', [])} />
        </div>

        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: '5px' }}>Job Sticker:</label>
          <button style={{ ...buttonStyle, marginBottom: '5px', width: '100%' }} onClick={handleGenerate}>Generate Job Sticker</button>
          <FileUpload label="Upload" bucketPath="job-sticker" onFilesUploaded={(f) => formik.setFieldValue('job_sticker_upload', f)} singleFileOnly={false} />
          <ImagePreview images={formik.values.job_sticker_upload || []} onDeleteImage={(i) => { const u = formik.values.job_sticker_upload.filter((_, idx) => idx !== i); formik.setFieldValue('job_sticker_upload', u); }} />
        </div>

        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: '5px' }}>Processed BE:</label>
          <FileUpload label="Upload BE Copy" bucketPath="processed_be_attachment" onFilesUploaded={(f) => formik.setFieldValue('processed_be_attachment', f)} singleFileOnly={false} />
          <ImagePreview images={formik.values.processed_be_attachment || []} onDeleteImage={(i) => { const u = formik.values.processed_be_attachment.filter((_, idx) => idx !== i); formik.setFieldValue('processed_be_attachment', u); }} />
        </div>
      </div>

      {/* More File Uploads - 3 Column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '10px' }}>
        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: '5px' }}>OOC Copy:</label>
          <FileUpload label="Upload OOC Copy" bucketPath="ooc_copies" onFilesUploaded={(f) => formik.setFieldValue('ooc_copies', f)} singleFileOnly={false} />
          <ImagePreview images={formik.values.ooc_copies || []} onDeleteImage={(i) => { const u = formik.values.ooc_copies.filter((_, idx) => idx !== i); formik.setFieldValue('ooc_copies', u); }} />
        </div>

        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: '5px' }}>Gate Pass:</label>
          <FileUpload label="Upload Gate Pass" bucketPath="gate_pass_copies" onFilesUploaded={(f) => formik.setFieldValue('gate_pass_copies', f)} singleFileOnly={false} />
          <ImagePreview images={formik.values.gate_pass_copies || []} onDeleteImage={(i) => { const u = formik.values.gate_pass_copies.filter((_, idx) => idx !== i); formik.setFieldValue('gate_pass_copies', u); }} />
        </div>

        <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '3px', backgroundColor: '#fafafa' }}>
          <label style={{ ...labelStyle, display: 'block', marginBottom: '5px' }}>DO Copies:</label>
          <FileUpload label="Upload DO Copies" bucketPath="do_copies" onFilesUploaded={(f) => formik.setFieldValue('do_copies', f)} singleFileOnly={false} />
          <ImagePreview images={formik.values.do_copies || []} onDeleteImage={(i) => { const u = formik.values.do_copies.filter((_, idx) => idx !== i); formik.setFieldValue('do_copies', u); }} />
        </div>
      </div>

      {/* Checkboxes Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '10px', backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '3px', border: '1px solid #eee' }}>
        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={formik.values.is_checklist_aprroved} onChange={(e) => { if (e.target.checked) { formik.setFieldValue('is_checklist_aprroved', true); formik.setFieldValue('is_checklist_aprroved_date', new Date().toISOString()); } else formik.setFieldValue('is_checklist_aprroved', false); }} style={checkboxInputStyle} />
          Checklist Approved
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={formik.values.examinationPlanning} onChange={(e) => { if (e.target.checked) { formik.setFieldValue('examinationPlanning', true); formik.setFieldValue('examination_planning_date', new Date().toISOString()); } else formik.setFieldValue('examinationPlanning', false); }} style={checkboxInputStyle} />
          Examination Planning
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={Boolean(formik.values.firstCheck)} onChange={(e) => { formik.setFieldValue('firstCheck', e.target.checked ? new Date().toISOString() : ''); }} style={checkboxInputStyle} />
          First Check
        </label>

        <label style={checkboxLabelStyle}>
          <input type="checkbox" checked={formik.values.doPlanning} onChange={(e) => { if (e.target.checked) { formik.setFieldValue('doPlanning', true); formik.setFieldValue('do_planning_date', new Date().toISOString()); } else formik.setFieldValue('doPlanning', false); }} style={checkboxInputStyle} />
          DO Planning
        </label>
      </div>

      {/* Document Type - HORIZONTAL */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
        <label style={{ ...labelStyle, margin: 0 }}>Document Type:</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Original Documents', 'Telex', 'Surrender BL', 'Waybill', 'Clear'].map(doc => (
            <label key={doc} style={{ ...radioLabelStyle, margin: 0 }}>
              <input type="radio" name="obl_telex_bl" value={doc === 'Original Documents' ? 'OBL' : doc} checked={formik.values.obl_telex_bl === (doc === 'Original Documents' ? 'OBL' : doc)} onChange={() => handleBlStatusChange({ target: { value: doc === 'Original Documents' ? 'OBL' : doc } })} style={radioInputStyle} />
              {doc === 'Original Documents' ? 'OBL' : doc}
            </label>
          ))}
        </div>
      </div>

      {/* Delivery Order Details */}
      <h3 style={sectionTitleStyle}>Delivery Order Details</h3>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>DO Type:</label>
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            {['ICD', 'Factory', 'Clear'].map(t => (
              <label key={t} style={{ ...radioLabelStyle, margin: 0 }}>
                <input type="radio" name="type_of_Do" value={t} checked={formik.values.type_of_Do === t} onChange={() => formik.setFieldValue('type_of_Do', t === 'Clear' ? '' : t)} style={radioInputStyle} />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>DO Validity:</label>
          <input type="date" style={inputStyle} value={formik.values.do_validity_upto_job_level || ''} onChange={(e) => formik.setFieldValue('do_validity_upto_job_level', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Required DO Validity:</label>
          <input type="date" style={inputStyle} value={formik.values.container_nos?.[0]?.required_do_validity_upto || ''} onChange={(e) => handleDateChange(e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={checkboxLabelStyle} >
            <input type="checkbox" checked={formik.values.do_revalidation} onChange={(e) => { if (e.target.checked) { formik.setFieldValue('do_revalidation', true); formik.setFieldValue('do_revalidation_date', new Date().toISOString()); } else formik.setFieldValue('do_revalidation', false); }} style={checkboxInputStyle} />
            DO Revalidation
          </label>
        </div>
      </div>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>DO Received:</label>
          <input type="datetime-local" style={inputStyle} value={formatDateTime(formik.values.do_completed || '')} onChange={(e) => formik.setFieldValue('do_completed', e.target.value)} />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>DO Valid Up to:</label>
          <input type="text" style={inputStyle} disabled value={formik.values.do_validity_upto_job_level || ''} />
        </div>
      </div>

      {/* Remarks */}
      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>Remarks:</label>
        <textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical', fontFamily: 'Arial' }} value={formik.values.remarks || ''} onChange={(e) => formik.setFieldValue('remarks', e.target.value)} placeholder="Enter remarks..." />
      </div>

      {/* Ex-Bond Section */}
      {formik.values.exBondValue === 'other' && (
        <>
          <h3 style={sectionTitleStyle}>In-Bond Details</h3>
          <div style={rowStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>InBond BE Number:</label>
              <input type="text" style={inputStyle} value={formik.values.in_bond_be_no || ''} onChange={(e) => formik.setFieldValue('in_bond_be_no', e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>InBond BE Date:</label>
              <input type="date" style={inputStyle} value={formik.values.in_bond_be_date || ''} onChange={(e) => formik.setFieldValue('in_bond_be_date', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>InBond BE Copy:</label>
            <FileUpload label="Upload" bucketPath="ex_be_copy_documents" onFilesUploaded={(f) => formik.setFieldValue('in_bond_ooc_copies', f)} singleFileOnly={false} />
            <ImagePreview images={formik.values.in_bond_ooc_copies || []} onDeleteImage={(i) => { const u = formik.values.in_bond_ooc_copies.filter((_, idx) => idx !== i); formik.setFieldValue('in_bond_ooc_copies', u); }} />
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '15px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button style={buttonStyle} onClick={handleSave}>Save Form</button>
        <button style={secondaryButtonStyle} onClick={handleReset}>Reset Form</button>
        <button style={successButtonStyle} onClick={handleExport}>Export Data</button>
        {ExBondflag && <button style={secondaryButtonStyle} onClick={resetOtherDetails}>Reset Ex-Bond</button>}
      </div>
    </div>
  );
}
