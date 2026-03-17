import { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { masteryToColor, NOT_TESTED_COLOR, NOT_TESTED_BORDER, masteryToSize } from '../utils/colorUtils';

const CHAPTER_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666',
  '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
];

const TAG_BORDER = {
  '重点': '#e63946',
  '难点': '#ff9f1c',
  '课程思政': '#2a9d8f',
};

/**
 * 递归设置节点样式
 * @param {Object} masteryMap - 掌握度数据 Map (null = 默认模式)
 * @param {string} mode - 'student' | 'teacher' | 'default'
 */
function styleTree(node, chapterColor, depth, masteryMap, mode) {
  const isLeaf = !node.children || node.children.length === 0;
  const cleanName = node.name.replace(/\s*【.*】$/, '');

  // 标签边框
  let borderColor = chapterColor;
  let borderWidth = 1;
  if (node.tags && node.tags.length > 0) {
    if (node.tags.includes('重点')) {
      borderColor = TAG_BORDER['重点'];
      borderWidth = 3;
    } else if (node.tags.includes('难点')) {
      borderColor = TAG_BORDER['难点'];
      borderWidth = 3;
    } else if (node.tags.includes('课程思政')) {
      borderColor = TAG_BORDER['课程思政'];
      borderWidth = 3;
    }
  }

  const fontSize = depth === 0 ? 16 : depth === 1 ? 13 : depth === 2 ? 11 : 10;

  // 默认颜色
  let nodeColor = isLeaf ? '#fff' : chapterColor;

  // 掌握度着色：默认白色填充 + 边框着色，掌握后才填色
  if (masteryMap && node.type === '知识点') {
    const data = masteryMap.get(cleanName);
    if (data) {
      const m = mode === 'teacher' ? data.avgMastery : data.mastery;
      node._mastery = m;
      node._masteryData = data;
      if (m >= 1) {
        // 完全掌握：填充章节色
        nodeColor = chapterColor;
      } else if (m > 0) {
        // 部分掌握：白色填充 + 章节色边框，边框粗细编码掌握度
        nodeColor = '#fff';
        borderColor = chapterColor;
        borderWidth = 2;
      } else {
        // 0% 掌握（全错）：红色边框空心
        nodeColor = '#fff';
        borderColor = '#e63946';
        borderWidth = 2.5;
      }
    } else {
      // 未测试的知识点
      nodeColor = '#fff';
      borderColor = NOT_TESTED_BORDER;
      borderWidth = 1;
      node._mastery = -1;
    }
  }

  node.itemStyle = { color: nodeColor, borderColor, borderWidth };
  node.label = {
    fontSize,
    color: depth <= 1 ? '#333' : '#555',
    fontWeight: depth <= 1 ? 'bold' : 'normal',
  };

  // 标签文字
  if (node.tags && node.tags.length > 0) {
    node.name = cleanName + ' 【' + node.tags.join('/') + '】';
  }

  if (depth >= 1) node.collapsed = true;

  if (node.children) {
    node.children.forEach(child => styleTree(child, chapterColor, depth + 1, masteryMap, mode));
  }
}

export default function MindMap({ data, searchKeyword, masteryMap, mode = 'default', onNodeClick, weakOnly = false }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const buildOption = useCallback(() => {
    if (!data) return null;

    const tree = JSON.parse(JSON.stringify(data));

    if (tree.children) {
      tree.children.forEach((chapter, idx) => {
        const color = CHAPTER_COLORS[idx % CHAPTER_COLORS.length];
        styleTree(chapter, color, 1, masteryMap, mode);
      });
    }

    tree.itemStyle = { color: '#5470c6', borderColor: '#335', borderWidth: 2 };
    tree.label = { fontSize: 18, fontWeight: 'bold', color: '#222' };

    // "只看未掌握"过滤：隐藏已完全掌握的知识点
    if (weakOnly && masteryMap) {
      const filterWeak = (node) => {
        if (node.children) {
          node.children = node.children.filter(filterWeak);
        }
        // 保留：非知识点节点（分类等）、未测试节点、未完全掌握的节点
        if (node.type === '知识点') {
          return node._mastery === undefined || node._mastery < 0 || node._mastery < 1;
        }
        // 分类节点：只要还有子节点就保留
        return !node.children || node.children.length > 0;
      };
      if (tree.children) {
        tree.children = tree.children.filter(filterWeak);
      }
    }

    // 搜索高亮
    if (searchKeyword && searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      const expandMatched = (node) => {
        let matched = node.name.toLowerCase().includes(keyword);
        if (node.children) {
          for (const child of node.children) {
            if (expandMatched(child)) matched = true;
          }
        }
        if (matched) {
          node.collapsed = false;
          if (node.name.toLowerCase().includes(keyword)) {
            node.itemStyle = {
              ...node.itemStyle,
              color: '#ffe066',
              borderColor: '#e63946',
              borderWidth: 3,
              shadowBlur: 10,
              shadowColor: 'rgba(230,57,70,0.5)',
            };
          }
        }
        return matched;
      };
      expandMatched(tree);
    }

    // 章节级别（depth 1）始终展开，含错题的分支展开到叶子
    if (tree.children) {
      for (const chapter of tree.children) {
        chapter.collapsed = false; // 章节始终展开
      }
    }
    if (masteryMap) {
      const expandWeak = (node) => {
        let hasWeak = false;
        if (node._mastery !== undefined && node._mastery >= 0 && node._mastery < 1) {
          hasWeak = true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (expandWeak(child)) hasWeak = true;
          }
        }
        if (hasWeak) node.collapsed = false;
        return hasWeak;
      };
      expandWeak(tree);
    }

    return {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        formatter: (params) => {
          const d = params.data;
          const name = d.name.replace(/\s*【.*】$/, '');
          let tip = `<b>${name}</b>`;
          if (d.type) tip += `<br/>类型: ${d.type}`;
          if (d.tags && d.tags.length > 0) tip += `<br/>标签: ${d.tags.join(', ')}`;

          if (d._mastery !== undefined) {
            if (d._mastery < 0) {
              tip += '<br/><span style="color:#999">未考查</span>';
            } else {
              const pct = Math.round(d._mastery * 100);
              const color = pct >= 80 ? '#2a9d8f' : pct >= 60 ? '#fac858' : '#e63946';
              tip += `<br/>掌握度: <b style="color:${color}">${pct}%</b>`;
              if (d._masteryData) {
                if (d._masteryData.wrongQuestions) {
                  tip += `<br/>错题: ${d._masteryData.wrongQuestions.length}道`;
                }
                if (d._masteryData.students) {
                  tip += `<br/>参与学生: ${d._masteryData.studentCount}人`;
                }
              }
            }
          }
          if (d.children) tip += `<br/>子节点: ${d.children.length}`;
          if (d._mastery !== undefined && d._mastery >= 0) {
            tip += '<br/><span style="color:#666;font-size:11px">点击查看详情</span>';
          }
          return tip;
        },
      },
      series: [
        {
          type: 'tree',
          data: [tree],
          layout: 'orthogonal',
          orient: 'LR',
          symbol: 'circle',
          symbolSize: (value, params) => {
            const d = params.data;
            if (d.type === 'root') return 18;
            // 教师端：节点大小编码掌握度
            if (mode === 'teacher' && d._mastery !== undefined && d._mastery >= 0) {
              return masteryToSize(d._mastery, !d.children || d.children.length === 0);
            }
            if (!d.children || d.children.length === 0) return 7;
            return 10;
          },
          initialTreeDepth: 2,
          animationDurationUpdate: 750,
          emphasis: { focus: 'ancestor' },
          leaves: {
            label: { position: 'right', fontSize: 10, color: '#666', rotate: 0 },
          },
          lineStyle: { width: 1.5, curveness: 0.5, color: '#c0c0c0' },
          roam: true,
          label: { position: 'right', verticalAlign: 'middle', align: 'left', rotate: 0 },
          left: '2%',
          right: '60%',
          top: '2%',
          bottom: '2%',
          expandAndCollapse: true,
        },
      ],
    };
  }, [data, searchKeyword, masteryMap, mode, weakOnly]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = buildOption();
    if (option) {
      chartInstance.current.setOption(option, true);
    }

    // 点击事件
    chartInstance.current.off('click');
    if (onNodeClick) {
      chartInstance.current.on('click', (params) => {
        if (params.data) onNodeClick(params.data);
      });
    }

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [buildOption, onNodeClick]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
}
