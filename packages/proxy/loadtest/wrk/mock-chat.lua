-- wrk script for ZIRI proxy mock chat completions
--
-- Usage:
--   ZIRI_APIKEY="<key>" wrk -t4 -c64 -d30s --latency -s ./wrk/mock-chat.lua "http://HOST:3100"
--
-- Optional args: wrk ... URL -- arg1 arg2 arg3
--   arg1: mockSleepMs (0-5000, default 0)
--   arg2: mockContentBytes (0-32768, default 0)
--   arg3: messageContentChars (request body size; 0="ping", else repeat "x")

local mockSleepMs = 0
local mockContentBytes = 0
local messageContentChars = 0

local threads = {}

count200 = 0
count400 = 0
count401 = 0
count403 = 0
count429 = 0
count500 = 0
count503 = 0
countOther = 0

function setup(thread)
  table.insert(threads, thread)
end

function init(args)
  mockSleepMs = tonumber(args[1]) or 0
  mockContentBytes = tonumber(args[2]) or 0
  local chars = tonumber(args[3]) or 0
  messageContentChars = (chars > 0 and chars <= 65536) and chars or 0
end

local function build_body()
  local content = (messageContentChars > 0) and string.rep("x", messageContentChars) or "ping"
  local body = string.format([[
{
  "provider": "openai",
  "model": "gpt-4",
  "messages": [{"role":"user","content":"%s"}],
  "mockSleepMs": %d,
  "mockContentBytes": %d
}
]], content, mockSleepMs, mockContentBytes)
  return body
end

request = function()
  local apiKey = os.getenv("ZIRI_APIKEY") or ""
  if apiKey == "" then
    -- If you see 400s, set ZIRI_APIKEY in your environment.
  end

  wrk.method = "POST"
  wrk.path = "/api/loadtest/mock-chat/completions"
  wrk.body = build_body()
  wrk.headers["Content-Type"] = "application/json"
  wrk.headers["X-API-Key"] = apiKey
  return wrk.format(nil, nil, nil, nil)
end

response = function(status, headers, body)
  if status == 200 then count200 = count200 + 1
  elseif status == 400 then count400 = count400 + 1
  elseif status == 401 then count401 = count401 + 1
  elseif status == 403 then count403 = count403 + 1
  elseif status == 429 then count429 = count429 + 1
  elseif status == 500 then count500 = count500 + 1
  elseif status == 503 then count503 = count503 + 1
  else countOther = countOther + 1
  end
end

done = function(summary, latency, requests)
  local total200, total400, total401, total403, total429, total500, total503, totalOther =
    0, 0, 0, 0, 0, 0, 0, 0

  for _, thread in ipairs(threads) do
    total200 = total200 + (thread:get("count200") or 0)
    total400 = total400 + (thread:get("count400") or 0)
    total401 = total401 + (thread:get("count401") or 0)
    total403 = total403 + (thread:get("count403") or 0)
    total429 = total429 + (thread:get("count429") or 0)
    total500 = total500 + (thread:get("count500") or 0)
    total503 = total503 + (thread:get("count503") or 0)
    totalOther = totalOther + (thread:get("countOther") or 0)
  end

  local total = total200 + total400 + total401 + total403 + total429 + total500 + total503 + totalOther
  local successRate = (total > 0 and total200 > 0) and (100.0 * total200 / total) or 0

  io.write("\nStatus code breakdown:\n")
  if total200 > 0 then io.write(string.format("  200: %d\n", total200)) end
  if total400 > 0 then io.write(string.format("  400: %d\n", total400)) end
  if total401 > 0 then io.write(string.format("  401: %d\n", total401)) end
  if total403 > 0 then io.write(string.format("  403: %d\n", total403)) end
  if total429 > 0 then io.write(string.format("  429: %d\n", total429)) end
  if total500 > 0 then io.write(string.format("  500: %d\n", total500)) end
  if total503 > 0 then io.write(string.format("  503: %d\n", total503)) end
  if totalOther > 0 then io.write(string.format("  other: %d\n", totalOther)) end
  io.write(string.format("\nSuccess rate (200/total): %.1f%% (%d/%d)\n", successRate, total200, total))
end

