import React from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

interface PitchBaseProps {
  width?: number;
  height?: number;
  children?: React.ReactNode;
}

export const PitchBase: React.FC<PitchBaseProps> = ({
  width,
  height,
  children,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const resolvedWidth = width ?? Math.max(240, Math.min(windowWidth - 56, 400));
  const resolvedHeight = height ?? Math.round(resolvedWidth * 0.68);
  const strokeColor = 'rgba(255, 255, 255, 0.35)';

  return (
    <Svg width={resolvedWidth} height={resolvedHeight} viewBox="0 0 100 68">
      {/* Mặt cỏ sân */}
      <Rect x="0" y="0" width="100" height="68" rx="2" fill="#163828" />

      {/* Các dải cắt cỏ dọc */}
      <Rect x="10" y="0" width="10" height="68" fill="#193F2D" />
      <Rect x="30" y="0" width="10" height="68" fill="#193F2D" />
      <Rect x="50" y="0" width="10" height="68" fill="#193F2D" />
      <Rect x="70" y="0" width="10" height="68" fill="#193F2D" />
      <Rect x="90" y="0" width="10" height="68" fill="#193F2D" />

      {/* Đường biên ngoài */}
      <Rect
        x="1"
        y="1"
        width="98"
        height="66"
        fill="none"
        stroke={strokeColor}
        strokeWidth="0.5"
      />

      {/* Vạch giữa sân & Vòng tròn trung tâm */}
      <Line x1="50" y1="1" x2="50" y2="67" stroke={strokeColor} strokeWidth="0.5" />
      <Circle cx="50" cy="34" r="9.15" fill="none" stroke={strokeColor} strokeWidth="0.5" />
      <Circle cx="50" cy="34" r="0.6" fill={strokeColor} />

      {/* Vòng cấm địa trái (Sân nhà) */}
      <Rect x="1" y="13.84" width="16.5" height="40.32" fill="none" stroke={strokeColor} strokeWidth="0.5" />
      <Rect x="1" y="24.84" width="5.5" height="18.32" fill="none" stroke={strokeColor} strokeWidth="0.5" />
      <Circle cx="12" cy="34" r="0.5" fill={strokeColor} />

      {/* Vòng cấm địa phải (Khung thành đối phương) */}
      <Rect x="82.5" y="13.84" width="16.5" height="40.32" fill="none" stroke={strokeColor} strokeWidth="0.5" />
      <Rect x="93.5" y="24.84" width="5.5" height="18.32" fill="none" stroke={strokeColor} strokeWidth="0.5" />
      <Circle cx="88" cy="34" r="0.5" fill={strokeColor} />

      {/* Khung thành 2 đầu */}
      <Rect x="0" y="30.34" width="1" height="7.32" fill="none" stroke="#FFFFFF" strokeWidth="0.6" />
      <Rect x="99" y="30.34" width="1" height="7.32" fill="none" stroke="#FFFFFF" strokeWidth="0.6" />

      {/* Lớp dữ liệu chiến thuật truyền từ ngoài vào */}
      {children}
    </Svg>
  );
};