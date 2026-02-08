

import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

interface EChartComponentProps {
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
}

// Access the echarts library from the window object where it's loaded via CDN
const echartsFromWindow = (window as any).echarts;

export const EChartComponent: React.FC<EChartComponentProps> = ({ option, style }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echartsFromWindow.init(chartRef.current);
      
      const resizeChart = () => {
        chartInstance.current?.resize();
      };
      
      window.addEventListener('resize', resizeChart);

      return () => {
        window.removeEventListener('resize', resizeChart);
        chartInstance.current?.dispose();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(option);
    }
  }, [option]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%', ...style }} />;
};