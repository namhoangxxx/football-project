import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { HeatmapZone } from '../../types/tactical';
import { PitchBase } from './PitchBase';

interface HeatmapPitchProps {
  teamName: string;
  zones: HeatmapZone[];
  fieldTilt: { defThird: number; midThird: number; attThird: number };
}

export const HeatmapPitch: React.FC<HeatmapPitchProps> = ({
  teamName,
  zones,
  fieldTilt,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🔥 Bản đồ Nhiệt & Khu vực Kiểm soát</Text>
      <Text style={styles.subText}>{teamName} • Mật độ hoạt động trên sân</Text>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          <Defs>
            <RadialGradient id="heatHot" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FF3D00" stopOpacity="0.72" />
              <Stop offset="55%" stopColor="#FFEA00" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#00E676" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {zones.map((z, idx) => (
            <Circle
              key={idx}
              cx={z.x}
              cy={z.y}
              r={7 + z.intensity * 6}
              fill="url(#heatHot)"
            />
          ))}
        </PitchBase>
      </View>

      {/* Thanh phân bổ kiểm soát 3 khu vực sân */}
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
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  subText: { color: '#AAAAAA', fontSize: 11, marginBottom: 10 },
  pitchWrapper: { alignItems: 'center' },
  tiltContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: '#161616',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tiltBox: { flex: 1, alignItems: 'center' },
  tiltPercent: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  tiltLabel: { color: '#888888', fontSize: 10, marginTop: 2 },
});