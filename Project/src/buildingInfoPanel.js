import * as THREE from 'three';

export class BuildingInfoPanel {
  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'building-info-panel';
    this.element.style.cssText = `
      position: fixed;
      top: 24px;
      left: 24px;
      max-width: 400px;
      padding: 16px 20px;
      background: rgba(12, 16, 24, 0.85);
      color: #f4f6fb;
      font-family: 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      border-radius: 12px;
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      backdrop-filter: blur(8px);
      z-index: 100;
      transition: opacity 0.3s ease;
    `;

    this.element.textContent = 'Click a building to view details.';
    document.body.appendChild(this.element);
  }

  update(buildingName) {
    if (!buildingName) {
      this.element.innerHTML = 'Click a building to view details.';
      return;
    }

    const info = BUILDING_INFO[buildingName];
    if (!info) {
      this.element.innerHTML = `
        <strong>${buildingName.replace(/_/g, ' ')}</strong><br/>
        <span style="opacity:0.7">Building information not available</span>
      `;
      return;
    }

    const buildingYear = getBuildingYear(buildingName);

    this.element.innerHTML = `
      <strong style="font-size: 16px; margin-bottom: 8px; display: block;">
        ${info.name}
      </strong>
      <div style="opacity:0.8; font-size: 13px; margin-bottom: 12px;">
        ${info.description}
      </div>
      <div style="opacity:0.6; font-size: 12px;">
        Built in ${buildingYear}
      </div>
    `;
  }

  hide() {
    this.element.style.opacity = '0';
  }

  show() {
    this.element.style.opacity = '1';
  }
}