import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { TeamPassNetwork } from '../../types/tactical';
import { PitchBase } from './PitchBase';

interface PassNetworkPitchProps {
  teamName: string;
  network: TeamPassNetwork;
}

export const PassNetworkPitch: React.FC<PassNetworkPitchProps> = ({
  teamName,
  network,
}) => {
  const nodeMap = new Map(network.nodes.map((n) => [n.id, n]));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🕸️ Mạng lưới Chuyền bóng (Pass Network)</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{network.formation}</Text>
        </View>
      </View>

      <Text style={styles.subText}>
        {teamName} • Trạm luân chuyển chính: <Text style={styles.highlight}>{network.playmakerName}</Text>
      </Text>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          {/* Các đường nối chuyền bóng */}
          {network.links.map((link, idx) => {
            const from = nodeMap.get(link.fromId);
            const to = nodeMap.get(link.toId);
            if (!from || !to) return null;

            return (
              <Line
                key={idx}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(0, 230, 118, 0.45)"
                strokeWidth={Math.max(0.35, link.weight * 0.16)}
              />
            );
          })}

          {/* 11 nút cầu thủ */}
          {network.nodes.map((node) => {
            const r = Math.max(2.3, Math.min(3.8, 1.8 + node.touches / 35));
            return (
              <G key={node.id}>
                <Circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill="#0F172A"
                  stroke="#00E676"
                  strokeWidth="0.65"
                />
                <SvgText
                  x={node.x}
                  y={node.y + 0.9}
                  fontSize="2.3"
                  fontWeight="bold"
                  fill="#FFFFFF"
                  textAnchor="middle"
                >
                  {node.number}
                </SvgText>
                <SvgText
                  x={node.x}
                  y={node.y + r + 2.4}
                  fontSize="2.1"
                  fill="#E2E8F0"
                  textAnchor="middle"
                >
                  {node.name}
                </SvgText>
              </G>
            );
          })}
        </PitchBase>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  badge: {
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { color: '#00E676', fontSize: 11, fontWeight: 'bold' },
  subText: { color: '#AAAAAA', fontSize: 11, marginBottom: 10 },
  highlight: { color: '#FFFFFF', fontWeight: 'bold' },
  pitchWrapper: { alignItems: 'center' },
});