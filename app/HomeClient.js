"use client";

import { useState, useEffect, useRef } from "react";

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
const BET_AMOUNT = 5000;

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
              가입 시 <b>500,000P</b> 지급 (가상 포인트)
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
          <div
            className={`tab ${tab === "chat" ? "active" : ""}`}
            onClick={() => setTab("chat")}
          >
            채팅 💬
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
                onBet={async (pick) => {
                  const res = await fetch(`${BASE}/api/bet`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ matchId: m.id, pick }),
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

        {tab === "chat" && <ChatPanel user={user} showToast={showToast} />}
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
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pick) return;
    const ok = window.confirm(
      `[${PICK_LABEL[pick]}] 에 ${BET_AMOUNT.toLocaleString()}P 를 베팅합니다.\n\n⚠️ 한 번 베팅하면 취소·수정할 수 없습니다.\n계속하시겠습니까?`
    );
    if (!ok) return;
    setLoading(true);
    const done = await onBet(pick);
    setLoading(false);
    if (done) {
      setPick(null);
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
          <div className="bet-amount-fixed">
            베팅 금액 <b>{BET_AMOUNT.toLocaleString()}P</b> 고정
          </div>
          <button
            className="btn"
            onClick={submit}
            disabled={!pick || loading}
          >
            {loading ? "..." : "베팅하기"}
          </button>
        </div>
      )}
    </div>
  );
}

function ChatPanel({ user, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(0);
  const listRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  };

  useEffect(() => {
    let alive = true;

    const poll = async () => {
      try {
        const after = lastIdRef.current;
        const res = await fetch(`${BASE}/api/chat?after=${after}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || data.messages.length === 0) return;
        lastIdRef.current = data.messages[data.messages.length - 1].id;
        setMessages((prev) => {
          const merged = after === 0 ? data.messages : [...prev, ...data.messages];
          return merged.slice(-200);
        });
        scrollToBottom();
      } catch {}
    };

    poll();
    const timer = setInterval(poll, 2500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      showToast(data.error || "전송 실패");
      return;
    }
    setInput("");
    // 내가 보낸 메시지 즉시 반영 (폴링 중복 방지)
    if (data.chat.id > lastIdRef.current) {
      lastIdRef.current = data.chat.id;
      setMessages((prev) => [...prev, data.chat].slice(-200));
      scrollToBottom();
    }
  };

  return (
    <>
      <div className="section-title">실시간 채팅</div>
      <div className="chat-box">
        <div className="chat-list" ref={listRef}>
          {messages.length === 0 && (
            <div className="empty">첫 메시지를 남겨보세요!</div>
          )}
          {messages.map((m) => {
            const mine = m.nickname === user.nickname;
            return (
              <div key={m.id} className={`chat-msg ${mine ? "mine" : ""}`}>
                <div className="chat-nick">{m.nickname}</div>
                <div className="chat-bubble">{m.message}</div>
              </div>
            );
          })}
        </div>
        <div className="chat-input">
          <input
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            maxLength={200}
          />
          <button className="btn" onClick={send} disabled={sending || !input.trim()}>
            전송
          </button>
        </div>
      </div>
    </>
  );
}
