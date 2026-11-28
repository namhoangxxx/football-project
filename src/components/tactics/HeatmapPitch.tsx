import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import { HeatmapZone } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';
import { PitchBase } from './PitchBase';

interface HeatmapPitchProps {
  teamName: string;
  zones: HeatmapZone[];
  fieldTilt: { defThird: number; midThird: number; attThird: number };
}

export const HeatmapPitch: React.FC<HeatmapPitchProps> = ({ teamName, zones, fieldTilt }) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="flame" size={15} color="#FF9100" />
          <Text style={styles.title} numberOfLines={1}>
            Bản đồ Nhiệt & Kiểm soát Lãnh thổ
          </Text>
        </View>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subText} numberOfLines={1}>
          {teamName} • Mật độ hoạt động theo 3 khu vực sân
        </Text>
        <Text style={styles.dirText}>Tấn công →</Text>
      </View>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          <Defs>
            <RadialGradient id="heatHot" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FF3D00" stopOpacity="0.78" />
              <Stop offset="55%" stopColor="#FFEA00" stopOpacity="0.38" />
              <Stop offset="100%" stopColor="#00E676" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {zones.map((z, idx) => (
            <Circle
              key={idx}
              cx={z.x}
              cy={z.y}
              r={6.5 + z.intensity * 6.5}
              fill="url(#heatHot)"
              fillOpacity={Math.max(0.45, Math.min(1, 0.35 + z.intensity * 0.65))}
            />
          ))}

          {/* Vạch chia ranh giới 1/3 sân nhà - Giữa sân - 1/3 sân đối phương */}
          <Line
            x1="33.3"
            y1="0"
            x2="33.3"
            y2="68"
            stroke="rgba(255, 255, 255, 0.28)"
            strokeWidth="0.45"
            strokeDasharray="1.5,1.5"
          />
          <Line
            x1="66.7"
            y1="0"
            x2="66.7"
            y2="68"
            stroke="rgba(255, 255, 255, 0.28)"
            strokeWidth="0.45"
            strokeDasharray="1.5,1.5"
          />
        </PitchBase>
      </View>

      <View style={styles.tiltBarTrack}>
        <View style={[styles.tiltSegDef, { flex: Math.max(8, fieldTilt.defThird) }]} />
        <View style={[styles.tiltSegMid, { flex: Math.max(8, fieldTilt.midThird) }]} />
        <View style={[styles.tiltSegAtt, { flex: Math.max(8, fieldTilt.attThird) }]} />
      </View>

      <View style={styles.tiltContainer}>
        <View style={styles.tiltBox}>
          <Text style={styles.tiltPercent}>{fieldTilt.defThird}%</Text>
          <Text style={styles.tiltLabel}>1/3 Sân nhà</Text>
        </View>
        <View style={styles.tiltBox}>
          <Text style={[styles.tiltPercent, { color: '#FFD600' }]}>{fieldTilt.midThird}%</Text>
          <Text style={styles.tiltLabel}>Khu vực giữa sân</Text>
        </View>
        <View style={styles.tiltBox}>
          <Text style={[styles.tiltPercent, { color: '#00E676' }]}>{fieldTilt.attThird}%</Text>
          <Text style={styles.tiltLabel}>1/3 Sân đối phương</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subText: { color: '#AAAAAA', fontSize: 11, flex: 1 },
  dirText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  pitchWrapper: { alignItems: 'center' },
  tiltBarTrack: {
    flexDirection: 'row',
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
    backgroundColor: '#262626',
  },
  tiltSegDef: { backgroundColor: '#94A3B8' },
  tiltSegMid: { backgroundColor: '#FFD600' },
  tiltSegAtt: { backgroundColor: '#00E676' },
  tiltContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    backgroundColor: '#161616',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tiltBox: { flex: 1, alignItems: 'center' },
  tiltPercent: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  tiltLabel: { color: '#888888', fontSize: 10, marginTop: 2 },
});