import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { TeamPassNetwork } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';
import { PitchBase } from './PitchBase';

interface PassNetworkPitchProps {
  teamName: string;
  network: TeamPassNetwork;
}

export const PassNetworkPitch: React.FC<PassNetworkPitchProps> = ({ teamName, network }) => {
  const nodeMap = new Map(network.nodes.map((n) => [n.id, n]));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="network" size={15} color="#00E676" />
          <Text style={styles.title} numberOfLines={1}>
            Mạng lưới Chuyền bóng
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{network.formation}</Text>
        </View>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subText} numberOfLines={1}>
          {teamName} • Hạt nhân: <Text style={styles.highlight}>{network.playmakerName}</Text>
        </Text>
        <Text style={styles.dirText}>Tấn công →</Text>
      </View>

      <View style={styles.pitchWrapper}>
        <PitchBase>
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
                stroke="rgba(0, 230, 118, 0.42)"
                strokeWidth={Math.max(0.35, link.weight * 0.15)}
              />
            );
          })}

          {network.nodes.map((node) => {
            const r = Math.max(2.3, Math.min(3.7, 1.8 + node.touches / 36));
            // Nếu cầu thủ đứng sát biên dọc dưới (y > 56), đẩy nhãn tên lên trên vòng tròn để không bị cắt chữ
            const placeLabelAbove = node.y > 56;
            const labelY = placeLabelAbove ? node.y - r - 1.1 : node.y + r + 2.5;
            const plateWidth = Math.max(8, Math.min(16, node.name.length * 1.45 + 2.5));

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
                  y={node.y + 0.85}
                  fontSize="2.2"
                  fontWeight="bold"
                  fill="#FFFFFF"
                  textAnchor="middle"
                >
                  {node.number}
                </SvgText>

                <Rect
                  x={node.x - plateWidth / 2}
                  y={labelY - 2.0}
                  width={plateWidth}
                  height={2.6}
                  rx={0.7}
                  fill="rgba(10, 15, 13, 0.78)"
                />
                <SvgText
                  x={node.x}
                  y={labelY}
                  fontSize="2.0"
                  fontWeight="600"
                  fill="#F1F5F9"
                  textAnchor="middle"
                >
                  {node.name}
                </SvgText>
              </G>
            );
          })}
        </PitchBase>
      </View>

      <Text style={styles.footerNote}>
        Kích thước vòng = Số lần chạm bóng • Độ dày nét = Tần suất phối hợp
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' },
  badge: { backgroundColor: '#2C2C2C', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#00E676', fontSize: 11, fontWeight: 'bold' },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subText: { color: '#AAAAAA', fontSize: 11, flex: 1 },
  dirText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  highlight: { color: '#FFFFFF', fontWeight: 'bold' },
  pitchWrapper: { alignItems: 'center' },
  footerNote: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
});