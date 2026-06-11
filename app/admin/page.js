"use client";

import { useState } from "react";

const BASE = "/toto";

function fmtKST(iso) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

const emptyForm = {
  homeTeam: "",
  awayTeam: "",
  homeFlag: "",
  awayFlag: "",
  venue: "",
  stage: "",
  kickoff: "",
  oddsHome: "2.0",
  oddsDraw: "3.0",
  oddsAway: "2.0",
};

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [matches, setMatches] = useState([]);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState(emptyForm);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  const headers = () => ({
    "Content-Type": "application/json",
    "x-admin-password": pw,
  });

  const load = async (password) => {
    const res = await fetch(`${BASE}/api/admin`, {
      headers: { "x-admin-password": password ?? pw },
    });
    if (!res.ok) {
      showToast("비밀번호가 틀렸습니다.");
      return false;
    }
    const data = await res.json();
    setMatches(data.matches);
    return true;
  };

  const login = async () => {
    const ok = await load(pw);
    if (ok) setAuthed(true);
  };

  const createMatch = async () => {
    const res = await fetch(`${BASE}/api/admin`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || "등록 실패");
    showToast("경기 등록 완료!");
    setForm(emptyForm);
    load();
  };

  const settle = async (matchId, result, homeScore, awayScore) => {
    const res = await fetch(`${BASE}/api/admin`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ matchId, result, homeScore, awayScore }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || "정산 실패");
    showToast(`정산 완료! (${data.settled}건)`);
    load();
  };

  if (!authed) {
    return (
      <>
        <div className="header">
          <div className="header-inner">
            <div className="logo">
              관리자 <span>콘솔</span>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="login-box">
            <h2>🔐 관리자 인증</h2>
            <p>관리자 비밀번호를 입력하세요.</p>
            <input
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button className="btn full" onClick={login}>
              입장
            </button>
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div className="header-inner">
          <div className="logo">
            관리자 <span>콘솔</span>
          </div>
          <a href={`${BASE}`} className="btn ghost" style={{ padding: "6px 12px", fontSize: 13 }}>
            메인으로
          </a>
        </div>
      </div>
      <div className="container">
        <div className="section-title">새 경기 등록</div>
        <div className="match-card">
          <div className="grid2">
            <Field label="홈팀" v={form.homeTeam} set={(v) => setForm({ ...form, homeTeam: v })} />
            <Field label="원정팀" v={form.awayTeam} set={(v) => setForm({ ...form, awayTeam: v })} />
            <Field label="홈 국기(이모지)" v={form.homeFlag} set={(v) => setForm({ ...form, homeFlag: v })} />
            <Field label="원정 국기(이모지)" v={form.awayFlag} set={(v) => setForm({ ...form, awayFlag: v })} />
          </div>
          <Field label="경기장" v={form.venue} set={(v) => setForm({ ...form, venue: v })} />
          <Field label="단계 (예: A조 1차전)" v={form.stage} set={(v) => setForm({ ...form, stage: v })} />
          <div className="admin-field">
            <label>킥오프 (한국시간)</label>
            <input
              type="datetime-local"
              value={form.kickoff}
              onChange={(e) => setForm({ ...form, kickoff: e.target.value })}
            />
          </div>
          <div className="grid3">
            <Field label="승 배당" v={form.oddsHome} set={(v) => setForm({ ...form, oddsHome: v })} />
            <Field label="무 배당" v={form.oddsDraw} set={(v) => setForm({ ...form, oddsDraw: v })} />
            <Field label="패 배당" v={form.oddsAway} set={(v) => setForm({ ...form, oddsAway: v })} />
          </div>
          <button className="btn full" style={{ marginTop: 8 }} onClick={createMatch}>
            경기 등록
          </button>
        </div>

        <div className="section-title">경기 목록 / 결과 정산</div>
        {matches.map((m) => (
          <AdminMatchCard key={m.id} match={m} onSettle={settle} />
        ))}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function Field({ label, v, set }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <input value={v} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

function AdminMatchCard({ match, onSettle }) {
  const [result, setResult] = useState(match.result || "HOME");
  const [hs, setHs] = useState(match.homeScore ?? "");
  const [as, setAs] = useState(match.awayScore ?? "");
  const done = match.status === "FINISHED";

  return (
    <div className="match-card">
      <div className="match-meta">
        <span>
          {match.stage} · 베팅 {match._count?.bets ?? 0}건
        </span>
        <span>{fmtKST(match.kickoff)}</span>
      </div>
      <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 12 }}>
        {match.homeFlag} {match.homeTeam} vs {match.awayTeam} {match.awayFlag}
      </div>

      {done ? (
        <div style={{ textAlign: "center", color: "var(--win)", fontWeight: 700 }}>
          ✓ 정산 완료 — {match.homeScore}:{match.awayScore} (
          {{ HOME: "홈승", DRAW: "무", AWAY: "원정승" }[match.result]})
        </div>
      ) : (
        <>
          <div className="grid3">
            <div className="admin-field">
              <label>홈 득점</label>
              <input type="number" value={hs} onChange={(e) => setHs(e.target.value)} />
            </div>
            <div className="admin-field">
              <label>원정 득점</label>
              <input type="number" value={as} onChange={(e) => setAs(e.target.value)} />
            </div>
            <div className="admin-field">
              <label>결과</label>
              <select value={result} onChange={(e) => setResult(e.target.value)}>
                <option value="HOME">홈승</option>
                <option value="DRAW">무</option>
                <option value="AWAY">원정승</option>
              </select>
            </div>
          </div>
          <button
            className="btn full accent"
            style={{ background: "var(--accent)" }}
            onClick={() => {
              if (confirm("정산하면 되돌릴 수 없습니다. 진행할까요?"))
                onSettle(match.id, result, hs, as);
            }}
          >
            결과 확정 & 정산
          </button>
        </>
      )}
    </div>
  );
}
