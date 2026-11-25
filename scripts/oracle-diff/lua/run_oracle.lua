-- WebPoB Official PathOfBuilding Oracle Runner
-- Executes inside `.cache/upstream-pob/src` (or `.cache/upstream-pob2/src`) via LuaJIT.
-- Usage: luajit /path/to/run_oracle.lua /path/to/input.xml

local xmlPath = arg[1]
if not xmlPath then
  io.stderr:write("Usage: luajit run_oracle.lua <xmlPath>\n")
  os.exit(1)
end

-- Strip PathOfBuilding's `#@` preprocessor header for standard LuaJIT
function loadfile(path)
  local f, err = io.open(path, "r")
  if not f then return nil, err end
  local s = f:read("*a")
  f:close()
  s = s:gsub("^#@[^\r\n]*", "--")
  return loadstring(s, "@" .. path)
end

function dofile(path)
  local fn, err = loadfile(path)
  if not fn then error(err) end
  return fn()
end

-- Suppress noisy stdout during PoB initialization by redirecting print temporarily
local origPrint = print
local logs = {}
print = function(...)
  local parts = {}
  for i = 1, select("#", ...) do
    parts[i] = tostring(select(i, ...))
  end
  logs[#logs + 1] = table.concat(parts, "\t")
end

dofile("HeadlessWrapper.lua")

local f, err = io.open(xmlPath, "r")
if not f then
  io.stderr:write("Failed to open XML: " .. tostring(err) .. "\n")
  os.exit(1)
end
local xmlText = f:read("*a")
f:close()

loadBuildFromXML(xmlText, "OracleBenchmark")
runCallback("OnFrame")

local out = build and build.calcsTab and build.calcsTab.mainOutput or {}
local offOut = out
if (out.TotalDPS == nil or out.TotalDPS == 0) and out.Minion and (out.Minion.TotalDPS or 0) > 0 then
  offOut = out.Minion
end

local function num(v)
  if type(v) ~= "number" or v ~= v or v == math.huge or v == -math.huge then
    return 0
  end
  return v
end

local offFields = {
  CombinedDPS = true,
  TotalDPS = true,
  AverageDamage = true,
  AverageHit = true,
  Speed = true,
  CritChance = true,
  CritMultiplier = true,
  HitChance = true,
  IgniteDPS = true,
  BleedDPS = true,
  TotalPoisonDPS = true,
  ImpaleDPS = true,
  SkillTriggerRate = true,
}

local fields = {
  "CombinedDPS",
  "TotalDPS",
  "FullDPS",
  "AverageDamage",
  "AverageHit",
  "Speed",
  "CritChance",
  "CritMultiplier",
  "HitChance",
  "ManaCost",
  "Life",
  "LifeUnreserved",
  "LifeRegen",
  "EnergyShield",
  "Ward",
  "Mana",
  "ManaUnreserved",
  "ManaRegen",
  "Spirit",
  "SpiritReserved",
  "SpiritUnreserved",
  "Armour",
  "PhysicalDamageReduction",
  "Evasion",
  "MeleeEvadeChance",
  "BlockChance",
  "SpellBlockChance",
  "SpellSuppressionChance",
  "FireResist",
  "FireResistOverCap",
  "FireResistMax",
  "ColdResist",
  "ColdResistOverCap",
  "ColdResistMax",
  "LightningResist",
  "LightningResistOverCap",
  "LightningResistMax",
  "ChaosResist",
  "ChaosResistOverCap",
  "ChaosResistMax",
  "Str",
  "Dex",
  "Int",
  "EffectiveMovementSpeedMod",
  "TotalEHP",
  "PhysicalMaximumHitTaken",
  "FireMaximumHitTaken",
  "ColdMaximumHitTaken",
  "LightningMaximumHitTaken",
  "IgniteDPS",
  "BleedDPS",
  "TotalPoisonDPS",
  "ImpaleDPS",
  "SkillTriggerRate",
  "PhysicalMin",
  "PhysicalMax",
  "FireMin",
  "FireMax",
  "ColdMin",
  "ColdMax",
  "LightningMin",
  "LightningMax",
  "ChaosMin",
  "ChaosMax",
}

local pairsOut = {}
for _, key in ipairs(fields) do
  local src = offFields[key] and offOut or out
  pairsOut[#pairsOut + 1] = string.format('"%s": %.6f', key, num(src[key]))
end

-- Emit clean JSON bounded by markers so TS runner parses cleanly even if Lua logged warnings
origPrint("__ORACLE_JSON_START__")
origPrint("{" .. table.concat(pairsOut, ", ") .. "}")
origPrint("__ORACLE_JSON_END__")
