import React, { useEffect, useRef } from 'react';

const RadarChart = ({ dataCurrent = [85, 78, 92, 88, 75, 82, 90], dataTarget = [95, 90, 95, 95, 90, 90, 95] }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Get container dimensions
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size considering DPR
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 30; // Slightly adjusted padding
    
    const labels = ['培养目标', '毕业要求', '主干学科', '课程设置', '课程体系', '教学计划', '质量评估'];
    const angleStep = (Math.PI * 2) / labels.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw Grid
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let j = 0; j <= labels.length; j++) {
            const angle = j * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * (radius * i / 5);
            const y = centerY + Math.sin(angle) * (radius * i / 5);
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Draw Axes & Labels
    for (let i = 0; i < labels.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.stroke();
        
        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelX = centerX + Math.cos(angle) * (radius + 20);
        const labelY = centerY + Math.sin(angle) * (radius + 20);
        ctx.fillText(labels[i], labelX, labelY);
    }
    
    // Draw Data Function
    function drawData(data, color, fillAlpha) {
        ctx.beginPath();
        ctx.fillStyle = color + fillAlpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        for (let i = 0; i <= data.length; i++) {
            const angle = (i % data.length) * angleStep - Math.PI / 2;
            const value = data[i % data.length] / 100;
            const x = centerX + Math.cos(angle) * (radius * value);
            const y = centerY + Math.sin(angle) * (radius * value);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.fill();
        ctx.stroke();
    }
    
    drawData(dataTarget, '#8b5cf6', '20'); // Purple with alpha
    drawData(dataCurrent, '#3b82f6', '30'); // Blue with alpha

  }, [dataCurrent, dataTarget]); // Re-draw on data change

  return (
    <canvas ref={canvasRef} className="w-full h-full" />
  );
};

export default RadarChart;
