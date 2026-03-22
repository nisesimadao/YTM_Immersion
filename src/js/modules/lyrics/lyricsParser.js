// ===================== LRC Lyrics Parser =====================
(function () {
  const LyricsParser = {
    // 基本的なLRCパース - parseBaseLRC (content_original.js互換)
    parseBaseLRC(lrc) {
      if (!lrc || typeof lrc !== 'string') return { lines: [], hasTs: false };
      
      const lines = lrc.split(/\r?\n/);
      const result = [];
      let hasTs = false;

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        const timeMatch = trimmed.match(/^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[1], 10);
          const seconds = parseInt(timeMatch[2], 10);
          const ms = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
          const time = minutes * 60 + seconds + ms / 1000;
          
          const text = trimmed.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]/, '').trim();
          
          result.push({ time, text });
          hasTs = true;
        } else {
          // タイムスタンプなしの行
          result.push({ text: trimmed, time: null });
        }
      }
      
      return { lines: result, hasTs };
    },

    // 既存のparseLRCメソッド
    parseLRC(lrc) {
      if (!lrc || typeof lrc !== 'string') return { lines: [], hasTs: false };
      
      const lines = lrc.split(/\r?\n/);
      const result = [];
      let hasTs = false;

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        const timeMatch = trimmed.match(/^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[1], 10);
          const seconds = parseInt(timeMatch[2], 10);
          const ms = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
          const time = minutes * 60 + seconds + ms / 1000;
          
          const text = trimmed.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]/, '').trim();
          
          result.push({ time, text });
          hasTs = true;
        } else {
          // タイムスタンプなしの行
          result.push({ text: trimmed });
        }
      }

      return { lines: result, hasTs };
    },

    // Dynamic.lrc用のパーサー
    parseDynamicLRC(lrc) {
      if (!lrc || typeof lrc !== 'string') return [];

      const lines = lrc.split(/\r?\n/);
      const result = [];

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        const timeMatch = trimmed.match(/^\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/);
        if (!timeMatch) continue;

        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        const ms = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
        const startTime = minutes * 60 + seconds + ms / 1000;

        const text = trimmed.replace(/^\[\d{2}:\d{2}(?:\.\d{1,3})?\]/, '');
        
        // 文字ごとのタイミングを解析
        const chars = this.parseCharTimings(text, startTime);
        
        result.push({
          startTimeMs: startTime * 1000,
          text: text.replace(/<\d{2}:\d{2}(?:\.\d{1,3})?>/g, ''),
          chars: chars
        });
      }

      return result;
    },

    // 文字ごとのタイミングを解析
    parseCharTimings(text, lineStartTime) {
      const chars = [];
      const tagRegex = /<(\d{2}):(\d{2})(?:\.(\d{1,3}))?>/g;
      let lastIndex = 0;
      let match;

      while ((match = tagRegex.exec(text)) !== null) {
        // タグまでのテキストを追加
        const beforeTag = text.slice(lastIndex, match.index);
        if (beforeTag) {
          for (const char of beforeTag) {
            chars.push({ c: char, t: lineStartTime * 1000 });
          }
        }

        // タグの時間を計算
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
        const tagTime = (minutes * 60 + seconds + ms / 1000) * 1000;

        lastIndex = match.index + match[0].length;
      }

      // 残りのテキストを追加
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        for (const char of remainingText) {
          chars.push({ c: char, t: lineStartTime * 1000 });
        }
      }

      return chars;
    },

    // サブ歌詞（デュエット用）のパース
    parseSubLRC(lrc) {
      const parsed = this.parseLRC(lrc);
      return {
        ...parsed,
        lines: parsed.lines.map(line => ({
          ...line,
          duetSide: 'right' // サブ歌詞は右側に表示
        }))
      };
    },

    // デュエット歌詞のマージ
    mergeDuetLines(mainLines, subLines) {
      const result = [];
      const excludedTimes = new Set();

      // サブ歌詞のタイムスタンプを収集
      subLines.forEach(subLine => {
        if (typeof subLine.time === 'number') {
          excludedTimes.add(Math.round(subLine.time * 100) / 100); // 小数点第2位で丸め
        }
      });

      // メイン歌詞を追加（重複時間を除外）
      mainLines.forEach(mainLine => {
        if (typeof mainLine.time === 'number') {
          const roundedTime = Math.round(mainLine.time * 100) / 100;
          if (excludedTimes.has(roundedTime)) {
            return; // 重複時間は除外
          }
        }
        result.push({ ...mainLine, duetSide: 'left' });
      });

      // サブ歌詞を追加
      subLines.forEach(subLine => {
        result.push({ ...subLine, duetSide: 'right' });
      });

      // 時間でソート
      result.sort((a, b) => {
        if (typeof a.time !== 'number' && typeof b.time !== 'number') return 0;
        if (typeof a.time !== 'number') return 1;
        if (typeof b.time !== 'number') return -1;
        return a.time - b.time;
      });

      return result;
    },

    // 動的ラインの正規化（文字レベルに展開）
    normalizeDynamicLinesToCharLevel(dynLines) {
      if (!Array.isArray(dynLines) || dynLines.length === 0) return dynLines;

      const toMs = (v) => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') {
          const n = Number(v);
          if (Number.isFinite(n)) return n;
        }
        return null;
      };

      const getLineStartMs = (line) => {
        if (!line) return null;
        return toMs(line.startTimeMs) ?? toMs(line.time) ?? null;
      };

      const getCharStartMs = (ch) => {
        if (!ch) return null;
        return toMs(ch.t) ?? toMs(ch.time) ?? toMs(ch.startTimeMs) ?? null;
      };

      const isWordChunk = (s) => {
        if (typeof s !== 'string') return false;
        return Array.from(s).length > 1;
      };

      const expandChunk = (chunkText, startMs, endMs) => {
        const arr = Array.from(String(chunkText ?? ''));
        const n = arr.length;
        if (!n) return [];
        const s = (typeof startMs === 'number' && Number.isFinite(startMs)) ? startMs : null;
        const e = (typeof endMs === 'number' && Number.isFinite(endMs)) ? endMs : null;

        if (s == null) return arr.map(c => ({ t: 0, c }));
        if (e == null || e <= s) return arr.map(c => ({ t: s, c }));

        const dur = Math.max(1, e - s);
        const step = dur / n;
        const out = [];
        for (let i = 0; i < n; i++) {
          out.push({ t: s + Math.floor(step * i), c: arr[i] });
        }
        return out;
      };

      for (let li = 0; li < dynLines.length; li++) {
        const line = dynLines[li];
        if (!line || !Array.isArray(line.chars) || line.chars.length === 0) continue;

        const hasChunk = line.chars.some(ch => isWordChunk(ch?.c));
        if (!hasChunk) continue;

        const nextLineStartMs = (li + 1 < dynLines.length) ? getLineStartMs(dynLines[li + 1]) : null;
        const lineStartMs = getLineStartMs(line) ?? getCharStartMs(line.chars[0]) ?? 0;

        const expanded = [];
        for (let i = 0; i < line.chars.length; i++) {
          const seg = line.chars[i];
          const segText = (seg && typeof seg.c === 'string') ? seg.c : '';
          const segStart = getCharStartMs(seg) ?? lineStartMs;

          let segEnd = (i + 1 < line.chars.length) ? getCharStartMs(line.chars[i + 1]) : null;
          if (segEnd == null) segEnd = toMs(line.endTimeMs) ?? nextLineStartMs ?? (segStart + 1500);
          if (typeof segEnd === 'number' && segEnd <= segStart) segEnd = segStart + 200;

          const segArr = Array.from(String(segText));
          if (segArr.length <= 1) {
            if (segArr.length === 1) expanded.push({ t: segStart, c: segArr[0] });
            continue;
          }

          expanded.push(...expandChunk(segText, segStart, segEnd));
        }

        line.chars = expanded;
        try {
          const rebuilt = expanded.map(x => x.c).join('');
          if (typeof line.text !== 'string' || line.text.length === 0) line.text = rebuilt;
        } catch (e) { }

        if (typeof line.startTimeMs !== 'number' || !Number.isFinite(line.startTimeMs)) {
          const firstT = expanded.length ? expanded[0].t : lineStartMs;
          line.startTimeMs = firstT;
        }
      }

      return dynLines;
    },

    // 時間でラインを検索
    getDynamicLineForTime(targetTime) {
      if (!window.dynamicLines || !Array.isArray(window.dynamicLines)) return null;
      
      const targetMs = targetTime * 1000;
      let bestLine = null;
      let bestDiff = Infinity;

      for (const line of window.dynamicLines) {
        if (!line || typeof line.startTimeMs !== 'number') continue;
        
        const diff = Math.abs(line.startTimeMs - targetMs);
        if (diff < bestDiff && line.startTimeMs <= targetMs) {
          bestDiff = diff;
          bestLine = line;
        }
      }

      return bestLine;
    },

    // サブボーカル用の動的ラインを検索
    getSubDynamicLineForTime(targetTime) {
      if (!window.duetSubDynamicLines || !Array.isArray(window.duetSubDynamicLines)) return null;
      
      const targetMs = targetTime * 1000;
      let bestLine = null;
      let bestDiff = Infinity;

      for (const line of window.duetSubDynamicLines) {
        if (!line || typeof line.startTimeMs !== 'number') continue;
        
        const diff = Math.abs(line.startTimeMs - targetMs);
        if (diff < bestDiff && line.startTimeMs <= targetMs) {
          bestDiff = diff;
          bestLine = line;
        }
      }

      return bestLine;
    }
  };

  // Module export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LyricsParser };
  }
  // ALWAYS attach to window in the browser extension environment
  window.LyricsParserModule = { LyricsParser };
})();
