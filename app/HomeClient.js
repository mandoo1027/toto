"use client";

import { useState } from "react";

const BASE = "/toto";

function fmtKST(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

const PICK_LABEL = { HOME: "승", DRAW: "무", AWAY: "패" };

export default function HomeClient({ initialUser, matches, initialBets }) {
  const [user, setUser] = useState(initialUser);
  const [bets, setBets] = useState(initialBets);
  const [tab, setTab] = useState("matches");
  const [toast, setToast] = useState("");
  const [nickname, setNickname] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const login = async () => {
    const res = await fetch(`${BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || "로그인 실패");
    setUser(data);
    showToast(`${data.nickname}님 환영합니다!`);
  };

  const logout = async () => {
    await fetch(`${BASE}/api/logout`, { method: "POST" });
    setUser(null);
    setBets([]);
    showToast("로그아웃되었습니다.");
  };

  const refreshMe = async () => {
    const res = await fetch(`${BASE}/api/me`);
    const data = await res.json();
    if (data.user) setUser(data.user);
  };

  const refreshBets = async () => {
    const res = await fetch(`${BASE}/api/bet`);
    if (res.ok) {
      const data = await res.json();
      setBets(data.bets);
    }
  };

  if (!user) {
    return (
      <>
        <Header user={null} />
        <div className="container">
          <div className="login-box">
            <h2>⚽ 월드컵 승무패 토토</h2>
            <p>
              닉네임만 입력하면 시작! <br />
              가입 시 <b>10,000P</b> 지급 (가상 포인트)
            </p>
            <input
              placeholder="닉네임 (2~12자)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              maxLength={12}
            />
            <button className="btn full" onClick={login}>
              시작하기
            </button>
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  const upcoming = matches.filter((m) => m.status === "SCHEDULED");
  const finished = matches.filter((m) => m.status === "FINISHED");
  const betMatchIds = new Set(bets.map((b) => b.matchId));

  return (
    <>
      <Header user={user} onLogout={logout} />
      <div className="container">
        <div className="tabs">
          <div
            className={`tab ${tab === "matches" ? "active" : ""}`}
            onClick={() => setTab("matches")}
          >
            경기
          </div>
          <div
            className={`tab ${tab === "mybets" ? "active" : ""}`}
            onClick={() => setTab("mybets")}
          >
            내 베팅 ({bets.length})
          </div>
        </div>

        {tab === "matches" && (
          <>
            <div className="section-title">진행 예정 경기</div>
            {upcoming.length === 0 && (
              <div className="empty">예정된 경기가 없습니다.</div>
            )}
            {upcoming.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                user={user}
                alreadyBet={betMatchIds.has(m.id)}
                onBet={async (pick, amount) => {
                  const res = await fetch(`${BASE}/api/bet`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ matchId: m.id, pick, amount }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    showToast(data.error || "베팅 실패");
                    return false;
                  }
                  showToast("베팅 완료!");
                  await refreshMe();
                  await refreshBets();
                  return true;
                }}
              />
            ))}

            {finished.length > 0 && (
              <>
                <div className="section-title">종료된 경기</div>
                {finished.map((m) => (
                  <MatchCard key={m.id} match={m} user={user} finished />
                ))}
              </>
            )}
          </>
        )}

        {tab === "mybets" && (
          <>
            <div className="section-title">내 베팅 내역</div>
            {bets.length === 0 && (
              <div className="empty">아직 베팅 내역이 없습니다.</div>
            )}
            {bets.map((b) => (
              <div className="my-bet" key={b.id}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {b.match.homeTeam} vs {b.match.awayTeam}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {PICK_LABEL[b.pick]} · {b.amount.toLocaleString()}P · 배당 {b.oddsAtBet}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {b.status === "PENDING" && (
                    <span className="result-pending">대기중</span>
                  )}
                  {b.status === "WON" && (
                    <span className="result-won">
                      +{b.payout.toLocaleString()}P
                    </span>
                  )}
                  {b.status === "LOST" && <span className="result-lost">낙첨</span>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function Header({ user, onLogout }) {
  return (
    <div className="header">
      <div className="header-inner">
        <div className="logo">
          월드컵 <span>승무패</span>
        </div>
        {user && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="points-badge">
              {user.nickname} · <b>{user.points.toLocaleString()}P</b>
            </div>
            <button
              className="btn ghost"
              style={{ padding: "6px 12px", fontSize: 13 }}
              onClick={onLogout}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, user, alreadyBet, onBet, finished }) {
  const [pick, setPick] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pick || !amount) return;
    setLoading(true);
    const ok = await onBet(pick, parseInt(amount, 10));
    setLoading(false);
    if (ok) {
      setPick(null);
      setAmount("");
    }
  };

  const isFinished = finished || match.status === "FINISHED";
  const locked = isFinished || alreadyBet;

  return (
    <div className="match-card">
      <div className="match-meta">
        <span>{match.stage}</span>
        <span>{fmtKST(match.kickoff)}</span>
      </div>

      <div className="match-teams">
        <div className="team">
          <div className="flag">{match.homeFlag || "🏳️"}</div>
          <div className="name">{match.homeTeam}</div>
        </div>
        {isFinished && match.homeScore != null ? (
          <div className="score">
            {match.homeScore} : {match.awayScore}
          </div>
        ) : (
          <div className="vs">VS</div>
        )}
        <div className="team">
          <div className="flag">{match.awayFlag || "🏳️"}</div>
          <div className="name">{match.awayTeam}</div>
        </div>
      </div>

      <div className="odds-row">
        {["HOME", "DRAW", "AWAY"].map((p) => {
          const val =
            p === "HOME"
              ? match.oddsHome
              : p === "DRAW"
              ? match.oddsDraw
              : match.oddsAway;
          const isWon = isFinished && match.result === p;
          return (
            <div
              key={p}
              className={`odds-btn ${pick === p ? "selected" : ""} ${
                isWon ? "won" : ""
              }`}
              onClick={() => !locked && setPick(p)}
              style={locked ? { cursor: "default" } : {}}
            >
              <div className="label">{PICK_LABEL[p]}</div>
              <div className="val">{val}</div>
            </div>
          );
        })}
      </div>

      {alreadyBet && !isFinished && (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
          이미 베팅한 경기입니다.
        </div>
      )}

      {!locked && (
        <div className="bet-panel">
          <input
            type="number"
            placeholder="베팅 포인트"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={user.points}
          />
          <button
            className="btn"
            onClick={submit}
            disabled={!pick || !amount || loading}
          >
            {loading ? "..." : "베팅"}
          </button>
        </div>
      )}
    </div>
  );
}
