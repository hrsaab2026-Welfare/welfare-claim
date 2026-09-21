/**
 * =========================================
 * Approval Flow Timeline Component v1.0
 * =========================================
 * แสดงขั้นตอนการอนุมัติสวัสดิการพนักงาน
 * 
 * วิธีใช้:
 * 1. Copy ไฟล์นี้เข้าไปในโฟลเดอร์ project
 * 2. ใส่ <script src="approvalFlowTimeline.js"></script> ในไฟล์ index.html
 * 3. เรียกใช้: displayTimeline(claimId) หลังโหลดข้อมูลคำขอเสร็จ
 */

// ========== CSS STYLES ==========
const timelineStyles = `
  .approval-timeline {
    margin: 20px 0;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 8px;
    border-left: 4px solid #1976d2;
  }

  .timeline-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .timeline-status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    margin-left: auto;
  }

  .timeline-status-badge.pending {
    background: #fff3cd;
    color: #856404;
  }

  .timeline-status-badge.approved {
    background: #d4edda;
    color: #155724;
  }

  .timeline-status-badge.rejected {
    background: #f8d7da;
    color: #721c24;
  }

  .timeline-steps {
    position: relative;
  }

  .timeline-step {
    display: flex;
    align-items: flex-start;
    margin-bottom: 20px;
    position: relative;
    padding-left: 50px;
  }

  .timeline-step::before {
    content: '';
    position: absolute;
    left: 0;
    top: 25px;
    width: 100%;
    height: 2px;
    background: #e0e0e0;
    z-index: 1;
  }

  .timeline-step:last-child::before {
    display: none;
  }

  .timeline-step.step-approved::before {
    background: #28a745;
  }

  .timeline-step.step-current::before {
    background: #ffc107;
  }

  .timeline-step.step-rejected::before {
    background: #dc3545;
  }

  .timeline-marker {
    position: absolute;
    left: 0;
    top: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid #e0e0e0;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    z-index: 2;
    font-size: 12px;
  }

  .timeline-step.step-approved .timeline-marker {
    background: #28a745;
    border-color: #28a745;
    color: white;
  }

  .timeline-step.step-current .timeline-marker {
    background: #ffc107;
    border-color: #ffc107;
    color: #333;
  }

  .timeline-step.step-rejected .timeline-marker {
    background: #dc3545;
    border-color: #dc3545;
    color: white;
  }

  .timeline-step.step-waiting .timeline-marker {
    background: #e9ecef;
    color: #999;
  }

  .timeline-content {
    flex: 1;
    margin-left: 20px;
  }

  .timeline-step-name {
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
  }

  .timeline-step-info {
    font-size: 13px;
    color: #666;
    line-height: 1.5;
  }

  .timeline-step-info.waiting {
    color: #999;
  }

  .timeline-step-info.approved {
    color: #155724;
  }

  .timeline-step-info.rejected {
    color: #721c24;
  }

  .timeline-waiting-on {
    background: #fff3cd;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 8px;
    font-size: 12px;
    border-left: 3px solid #ffc107;
  }

  .timeline-waiting-on strong {
    color: #856404;
  }

  .timeline-error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
    padding: 12px;
    border-radius: 4px;
    margin-top: 10px;
  }

  .timeline-loading {
    text-align: center;
    padding: 20px;
    color: #999;
  }
`;

// ========== MAIN FUNCTION ==========

/**
 * แสดง Approval Flow Timeline สำหรับใบที่ยื่น
 * @param {string} claimId - เลขที่คำขอ
 */
async function displayTimeline(claimId) {
  // inject CSS ครั้งแรก
  if (!document.getElementById('timelineStyles')) {
    const style = document.createElement('style');
    style.id = 'timelineStyles';
    style.textContent = timelineStyles;
    document.head.appendChild(style);
  }

  // หา container หรือสร้างใหม่
  let container = document.getElementById('approvalTimeline');
  if (!container) {
    container = document.createElement('div');
    container.id = 'approvalTimeline';
    container.className = 'approval-timeline';
    
    // ใส่ไว้หลังจากฟอร์มหลัก
    const form = document.querySelector('form') || document.body;
    form.parentNode.insertBefore(container, form.nextSibling);
  }

  if (!claimId) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  
  const titleHtml = `
    <div class="timeline-title">
      <span>📋 ขั้นตอนการอนุมัติ</span>
      <span id="timelineStatus" class="timeline-status-badge pending"></span>
    </div>
  `;
  
  if (!container.innerHTML.includes('timelineStatus')) {
    container.innerHTML = titleHtml + '<div id="timelineContent"></div>';
  }

  const content = document.getElementById('timelineContent');
  content.innerHTML = '<div class="timeline-loading">⏳ กำลังโหลด...</div>';

  try {
    const result = await callApi('getClaimTimeline', { claimId });

    if (!result.success) {
      content.innerHTML = `<div class="timeline-error">⚠️ ${result.error}</div>`;
      return;
    }

    const { status, timeline, waitingDays, currentStep, totalSteps } = result;
    
    // อัปเดต status badge
    const statusBadge = document.getElementById('timelineStatus');
    const statusMap = {
      'approved': { text: '✓ อนุมัติเรียบร้อย', class: 'approved' },
      'pending': { text: '⏳ รออนุมัติ', class: 'pending' },
      'rejected': { text: '✕ ไม่อนุมัติ', class: 'rejected' },
      'cancelled': { text: '⊗ ยกเลิกแล้ว', class: 'rejected' }
    };
    const statusInfo = statusMap[status] || { text: status, class: 'pending' };
    statusBadge.textContent = statusInfo.text;
    statusBadge.className = `timeline-status-badge ${statusInfo.class}`;

    // สร้าง timeline steps
    let html = '<div class="timeline-steps">';

    timeline.forEach((step, index) => {
      const stateClass = `step-${step.state}`;
      const stepNum = index + 1;
      const icon = {
        'approved': '✓',
        'current': '⏳',
        'rejected': '✕',
        'waiting': stepNum
      }[step.state] || stepNum;

      html += `
        <div class="timeline-step ${stateClass}">
          <div class="timeline-marker">${icon}</div>
          <div class="timeline-content">
            <div class="timeline-step-name">${step.stepName}</div>
      `;

      if (step.state === 'approved') {
        html += `
          <div class="timeline-step-info approved">
            ✓ อนุมัติโดย: ${step.by}
            <br/>วันที่: ${step.at}
            ${step.note ? `<br/>หมายเหตุ: ${step.note}` : ''}
            ${step.onBehalf ? '<br/><em>(อนุมัติแทน)</em>' : ''}
          </div>
        `;
      } else if (step.state === 'rejected') {
        html += `
          <div class="timeline-step-info rejected">
            ✕ ไม่อนุมัติโดย: ${step.by}
            <br/>วันที่: ${step.at}
            ${step.note ? `<br/>เหตุผล: ${step.note}` : ''}
          </div>
        `;
      } else if (step.state === 'current') {
        html += `
          <div class="timeline-step-info">
            ⏳ รออนุมัติจาก:
            <div class="timeline-waiting-on">
              <strong>${step.waitingOn.join(', ') || 'ไม่มีผู้อนุมัติ'}</strong>
              <br/><small>รออนุมัติมา ${waitingDays} วันแล้ว</small>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="timeline-step-info waiting">
            ⧗ รอการดำเนินการในขั้นก่อนหน้า
          </div>
        `;
      }

      html += '</div></div>';
    });

    html += '</div>';
    content.innerHTML = html;

  } catch (err) {
    content.innerHTML = `<div class="timeline-error">❌ เกิดข้อผิดพลาด: ${err.message}</div>`;
  }
}

// ========== AUTO-INIT ==========
// พยายามหา callApi function ที่อยู่ในไฟล์ index.html
// ถ้าไม่เจอ ให้ alert ว่าต้องติดตั้งเอง
if (typeof callApi === 'undefined') {
  console.warn('[Timeline] ไม่พบ callApi function ให้เรียกใช้ displayTimeline() หลังจากโหลดคำขอเสร็จ');
}
