import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type IconName =
  | 'live'
  | 'calendar'
  | 'check'
  | 'trophy'
  | 'search'
  | 'close'
  | 'chart'
  | 'tactics'
  | 'clock'
  | 'jersey'
  | 'back'
  | 'home'
  | 'plane'
  | 'brain'
  | 'swords'
  | 'shield'
  | 'target'
  | 'flame'
  | 'compass'
  | 'network'
  | 'alert'
  | 'zap';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 16,
  color = '#FFFFFF',
}) => {
  switch (name) {
    case 'live':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="4" fill={color} />
          <Path
            d="M7.76 7.76a6 6 0 0 0 0 8.48m8.48-8.48a6 6 0 0 1 0 8.48M4.93 4.93a10 10 0 0 0 0 14.14m14.14-14.14a10 10 0 0 1 0 14.14"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
          <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
        </Svg>
      );

    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Polyline
            points="9 12 11 14 15 10"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'trophy':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22m7-7.34V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
          <Line x1="20" y1="20" x2="16.35" y2="16.35" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'chart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'tactics':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" />
          <Line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth="1.5" />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
        </Svg>
      );

    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Polyline points="12 7 12 12 15 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'jersey':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'back':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="15 18 9 12 15 6"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'plane':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'brain':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v2a3 3 0 0 0 2 2.83V17a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-2.17A3 3 0 0 0 19 12v-2a3 3 0 0 0-3-3V6a4 4 0 0 0-4-4Z"
            stroke={color}
            strokeWidth="2"
          />
        </Svg>
      );

    case 'swords':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="13" y1="19" x2="19" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'target':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
        </Svg>
      );

    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'flame':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'compass':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
          <Path
            d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'network':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="6" cy="6" r="2.5" stroke={color} strokeWidth="2" />
          <Circle cx="18" cy="7" r="2.5" stroke={color} strokeWidth="2" />
          <Circle cx="12" cy="18" r="2.5" stroke={color} strokeWidth="2" />
          <Line x1="8.2" y1="7" x2="15.5" y2="7" stroke={color} strokeWidth="1.8" />
          <Line x1="7.4" y1="8.1" x2="10.8" y2="15.8" stroke={color} strokeWidth="1.8" />
          <Line x1="16.6" y1="9.1" x2="13.2" y2="15.8" stroke={color} strokeWidth="1.8" />
        </Svg>
      );

    case 'alert':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="12" cy="17" r="1" fill={color} />
        </Svg>
      );

    case 'zap':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
  }
};