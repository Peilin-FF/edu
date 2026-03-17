import { useMemo } from 'react';

/**
 * 班级学习诊断报告组件
 * props: { students: [{姓名, 学生ID, 总分, 题目列表}], classMastery: Map }
 */
export default function ClassReport({ students, classMastery }) {
  const report = useMemo(() => {
    if (!students || students.length === 0) return null;

    const scores = students.map(s => s['总分'] || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = scores.filter(s => s >= 60).length;
    const passRate = (passCount / scores.length * 100).toFixed(0);

    // 分数分布
    const dist = Array(10).fill(0);
    scores.forEach(s => {
      const idx = Math.min(Math.floor(s / 10), 9);
      dist[idx]++;
    });

    // 题目错误率分析（合并所有学生的作答）
    const questionMap = new Map();
    for (const stu of students) {
      for (const q of stu['题目列表'] || []) {
        if (!questionMap.has(q['题目ID'])) {
          questionMap.set(q['题目ID'], {
            id: q['题目ID'],
            type: q['题型'],
            text: q['题目'],
            kp: q['知识点'],
            fullScore: q['满分'],
            totalStudents: 0,
            wrongStudents: 0,
            totalEarned: 0,
          });
        }
        const qm = questionMap.get(q['题目ID']);
        qm.totalStudents++;
        if ((q['得分'] || 0) < (q['满分'] || 0)) qm.wrongStudents++;
        qm.totalEarned += (q['得分'] || 0);
      }
    }
    const questions = Array.from(questionMap.values()).map(q => ({
      ...q,
      errorRate: q.totalStudents > 0 ? (q.wrongStudents / q.totalStudents * 100) : 0,
      avgScore: q.totalStudents > 0 ? (q.totalEarned / q.totalStudents) : 0,
    }));
    const highErrorQuestions = questions
      .filter(q => q.errorRate > 30)
      .sort((a, b) => b.errorRate - a.errorRate);

    // 知识点掌握率排序
    const kpList = classMastery
      ? Array.from(classMastery.entries())
          .map(([name, data]) => ({ name, mastery: data.avgMastery, count: data.studentCount }))
          .sort((a, b) => a.mastery - b.mastery)
      : [];
    const severe = kpList.filter(k => k.mastery < 0.5);
    const moderate = kpList.filter(k => k.mastery >= 0.5 && k.mastery < 0.7);
    const good = kpList.filter(k => k.mastery >= 0.7);

    return { avg, max, min, passRate, passCount, dist, scores, highErrorQuestions, severe, moderate, good, kpList };
  }, [students, classMastery]);

  if (!report) return <div className="loading">加载中...</div>;

  return (
    <div className="report">
      {/* 一、总体表现 */}
      <section className="report-section">
        <h2 className="report-h2">一、总体表现概览</h2>
        <div className="report-summary">
          本次考试共{students[0]?.['题目列表']?.length || 0}道题目，满分100分。
          班级{report.avg >= 75 ? '整体表现良好' : '整体表现一般'}，
          {report.severe.length > 0 ? `存在${report.severe.length}个严重薄弱知识点。` : '无严重薄弱知识点。'}
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{report.avg.toFixed(1)}</div>
            <div className="stat-label">班级均分</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{report.passRate}%</div>
            <div className="stat-label">及格率（{report.passCount}/{students.length}）</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{report.max}</div>
            <div className="stat-label">最高分</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{report.min}</div>
            <div className="stat-label">最低分</div>
          </div>
        </div>

        {/* 分数分布条形图（纯CSS实现） */}
        <h3 className="report-h3">分数分布</h3>
        <div className="dist-chart">
          {report.dist.map((count, i) => (
            <div key={i} className="dist-bar-wrap">
              <div className="dist-count">{count || ''}</div>
              <div
                className="dist-bar"
                style={{
                  height: `${count * 40}px`,
                  background: i < 6 ? '#e63946' : i < 8 ? '#fac858' : '#2a9d8f',
                }}
              />
              <div className="dist-label">{i * 10}-{i * 10 + 9}</div>
            </div>
          ))}
        </div>

        {/* 学生成绩明细 */}
        <h3 className="report-h3">学生成绩</h3>
        <table className="report-table">
          <thead>
            <tr><th>姓名</th><th>学号</th><th>总分</th><th>等级</th></tr>
          </thead>
          <tbody>
            {[...students].sort((a, b) => (b['总分'] || 0) - (a['总分'] || 0)).map(s => (
              <tr key={s['学生ID']}>
                <td>{s['姓名']}</td>
                <td>{s['学生ID']}</td>
                <td><b>{s['总分']}</b></td>
                <td>
                  <span className={`rbadge ${s['总分'] >= 80 ? 'rbadge-good' : s['总分'] >= 60 ? 'rbadge-mid' : 'rbadge-bad'}`}>
                    {s['总分'] >= 80 ? '优良' : s['总分'] >= 60 ? '及格' : '不及格'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 二、高错误率题目 */}
      <section className="report-section">
        <h2 className="report-h2">二、高错误率题目分析</h2>
        {report.highErrorQuestions.length > 0 ? (
          <table className="report-table">
            <thead>
              <tr><th>题号</th><th>题型</th><th>知识点</th><th>错误率</th><th>均分/满分</th><th>程度</th></tr>
            </thead>
            <tbody>
              {report.highErrorQuestions.map(q => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td>{q.type}</td>
                  <td>{q.kp || '-'}</td>
                  <td><b>{q.errorRate.toFixed(0)}%</b></td>
                  <td>{q.avgScore.toFixed(1)}/{q.fullScore}</td>
                  <td>
                    <span className={`rbadge ${q.errorRate >= 60 ? 'rbadge-bad' : 'rbadge-mid'}`}>
                      {q.errorRate >= 60 ? '严重' : '中等'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="report-note">无高错误率题目（错误率 &gt; 30%）</p>
        )}
      </section>

      {/* 三、知识点掌握诊断 */}
      <section className="report-section">
        <h2 className="report-h2">三、知识点掌握情况诊断</h2>

        {report.severe.length > 0 && (
          <>
            <h3 className="report-h3">
              <span className="rbadge rbadge-bad">严重薄弱</span> 掌握率 &lt; 50%
            </h3>
            <div className="kp-list">
              {report.severe.map(k => (
                <div key={k.name} className="kp-item kp-severe">
                  <span className="kp-name">{k.name}</span>
                  <div className="kp-bar-wrap">
                    <div className="kp-bar" style={{ width: `${k.mastery * 100}%`, background: '#e63946' }} />
                  </div>
                  <span className="kp-pct">{(k.mastery * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </>
        )}

        {report.moderate.length > 0 && (
          <>
            <h3 className="report-h3">
              <span className="rbadge rbadge-mid">中等薄弱</span> 掌握率 50%-70%
            </h3>
            <div className="kp-list">
              {report.moderate.map(k => (
                <div key={k.name} className="kp-item">
                  <span className="kp-name">{k.name}</span>
                  <div className="kp-bar-wrap">
                    <div className="kp-bar" style={{ width: `${k.mastery * 100}%`, background: '#fac858' }} />
                  </div>
                  <span className="kp-pct">{(k.mastery * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </>
        )}

        {report.good.length > 0 && (
          <>
            <h3 className="report-h3">
              <span className="rbadge rbadge-good">掌握良好</span> 掌握率 &ge; 70%
            </h3>
            <div className="kp-list">
              {report.good.map(k => (
                <div key={k.name} className="kp-item">
                  <span className="kp-name">{k.name}</span>
                  <div className="kp-bar-wrap">
                    <div className="kp-bar" style={{ width: `${k.mastery * 100}%`, background: '#2a9d8f' }} />
                  </div>
                  <span className="kp-pct">{(k.mastery * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 四、教学建议 */}
      <section className="report-section">
        <h2 className="report-h2">四、教学建议</h2>
        {report.severe.length > 0 && (
          <div className="rec-card">
            <h4>重点补救：{report.severe.map(k => k.name).join('、')}</h4>
            <p>以上知识点班级掌握率低于 50%，建议安排专项讲解和练习，重新巩固核心概念。</p>
          </div>
        )}
        {report.moderate.length > 0 && (
          <div className="rec-card">
            <h4>加强训练：{report.moderate.map(k => k.name).join('、')}</h4>
            <p>以上知识点掌握率在 50%-70%，建议通过案例分析和针对性习题提升理解深度。</p>
          </div>
        )}
        {report.max - report.min > 20 && (
          <div className="rec-card">
            <h4>分层教学</h4>
            <p>班级最高分{report.max}与最低分{report.min}相差{report.max - report.min}分，建议根据掌握程度分组实施差异化辅导。</p>
          </div>
        )}
      </section>

      <div className="report-footer">
        EduClaw 学习分析系统 | 数据来源：{students[0]?.['作业考试时间']} 考试
      </div>
    </div>
  );
}
