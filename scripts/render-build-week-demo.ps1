param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,

  [Parameter(Mandatory = $true)]
  [string]$FfmpegPath
)

$ErrorActionPreference = "Stop"
$wayloRepo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$wayloIntermediate = Join-Path $wayloRepo ".submission-video"
$wayloOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$wayloEncoder = [System.IO.Path]::GetFullPath($FfmpegPath)

if (-not (Test-Path -LiteralPath $wayloEncoder -PathType Leaf)) {
  throw "FFmpeg was not found at $wayloEncoder"
}

New-Item -ItemType Directory -Path $wayloIntermediate -Force | Out-Null
New-Item -ItemType Directory -Path $wayloOutput -Force | Out-Null

$wayloScenes = @(
  [pscustomobject]@{
    Id = "promise"
    Narration = "Changing one course can move an entire transfer plan. Before I click anything, Waylo shows this seeded student's real consequence: Fall 2028 becomes Spring 2029, four milestones move, and the saved baseline stays protected. Waylo is an evidence-grounded academic decision simulator for community-college transfer students."
  },
  [pscustomobject]@{
    Id = "consequence"
    Narration = "This is a seeded College of the Canyons student on a validated Data Science route. I'll ask Waylo what happens if Calculus I moves. The result is explicitly recorded, not live. GPT-5.6 interprets the request into a strict command. The consequence engine shows the new transfer term and every affected prerequisite milestone, without replacing the saved plan."
  },
  [pscustomobject]@{
    Id = "validation"
    Narration = "Now Waylo separates interpretation from academic validity. Deterministic code searches a bounded set of candidates, rejects invalid schedules, attempts one allowlisted repair, and revalidates it from scratch. A model cannot invent a trusted course, grant credit, waive a prerequisite, or bypass confirmation. Judge Mode exposes the schema, candidate counts, rejection, repair, rules, evidence version, and safe architecture without exposing prompts, private data, or hidden reasoning."
  },
  [pscustomobject]@{
    Id = "evidence"
    Narration = "A schedule can be internally valid while an equivalency still needs verification. Waylo carries source status into the route and distinguishes verified evidence, partial evidence, and student-reported counselor confirmation. It shows exactly what is known, what is uncertain, and what should be checked before acting."
  },
  [pscustomobject]@{
    Id = "handoff"
    Narration = "The Advisor Decision Packet turns the simulation into a better counselor conversation. It separates route facts, unresolved evidence, constraints, alternatives, and exact questions. Codex helped translate the human safety boundary into the candidate-search and revalidation loop, then browser-tested this same judge path and caught presentation and live-mode risks before release. Waylo combines GPT-5.6 interpretation, deterministic academic validation, and human confirmation so students can see what changes before they change their plan."
  }
)

function Get-WayloDurationSeconds {
  param([Parameter(Mandatory = $true)][string]$MediaPath)

  $wayloPreviousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $wayloProbeText = (& $wayloEncoder -hide_banner -i $MediaPath -f null - 2>&1 | Out-String)
  }
  finally {
    $ErrorActionPreference = $wayloPreviousErrorPreference
  }
  $wayloDurationMatch = [regex]::Match($wayloProbeText, "Duration:\s*(?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+(?:\.\d+)?)")
  if (-not $wayloDurationMatch.Success) {
    throw "Could not read media duration for $MediaPath"
  }

  return ([double]$wayloDurationMatch.Groups["hours"].Value * 3600) +
    ([double]$wayloDurationMatch.Groups["minutes"].Value * 60) +
    [double]$wayloDurationMatch.Groups["seconds"].Value
}

function ConvertTo-WayloSrtTime {
  param([Parameter(Mandatory = $true)][double]$Seconds)
  return [TimeSpan]::FromSeconds($Seconds).ToString("hh\:mm\:ss\,fff")
}

Add-Type -AssemblyName System.Speech
$wayloSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$wayloVoiceNames = @($wayloSynth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
if ($wayloVoiceNames -contains "Microsoft Zira Desktop") {
  $wayloSynth.SelectVoice("Microsoft Zira Desktop")
}
$wayloSynth.Rate = -1
$wayloSynth.Volume = 100

$wayloAudioFiles = @()
$wayloTimings = @()

try {
  foreach ($wayloScene in $wayloScenes) {
    $wayloAudioPath = Join-Path $wayloIntermediate ($wayloScene.Id + ".wav")
    $wayloSynth.SetOutputToWaveFile($wayloAudioPath)
    $wayloSynth.Speak($wayloScene.Narration)
    $wayloSynth.SetOutputToNull()
    $wayloDuration = Get-WayloDurationSeconds -MediaPath $wayloAudioPath
    $wayloAudioFiles += $wayloAudioPath
    $wayloTimings += [pscustomobject]@{
      id = $wayloScene.Id
      durationSeconds = $wayloDuration
      narration = $wayloScene.Narration
    }
  }
}
finally {
  $wayloSynth.Dispose()
}

$wayloUtf8 = New-Object System.Text.UTF8Encoding($false)
$wayloTimingsPath = Join-Path $wayloIntermediate "timings.json"
[System.IO.File]::WriteAllText($wayloTimingsPath, ($wayloTimings | ConvertTo-Json -Depth 4), $wayloUtf8)

$wayloConcatPath = Join-Path $wayloIntermediate "audio-list.txt"
$wayloConcatLines = $wayloAudioFiles | ForEach-Object {
  "file '" + ($_.Replace("\", "/").Replace("'", "''")) + "'"
}
[System.IO.File]::WriteAllLines($wayloConcatPath, $wayloConcatLines, $wayloUtf8)

$wayloNarrationPath = Join-Path $wayloIntermediate "narration.wav"
& $wayloEncoder -hide_banner -loglevel error -y -f concat -safe 0 -i $wayloConcatPath -c:a pcm_s16le $wayloNarrationPath
if ($LASTEXITCODE -ne 0) {
  throw "FFmpeg could not concatenate the narration."
}

$wayloRawVideo = Join-Path $wayloIntermediate "waylo-demo-raw.webm"
$wayloCaptureScript = Join-Path $wayloRepo "scripts\record-build-week-demo.mjs"
Push-Location $wayloRepo
try {
  & node $wayloCaptureScript $wayloTimingsPath $wayloRawVideo
  if ($LASTEXITCODE -ne 0) {
    throw "The Playwright video capture failed."
  }
}
finally {
  Pop-Location
}

$wayloFinalVideo = Join-Path $wayloOutput "Waylo-Build-Week-Demo.mp4"
& $wayloEncoder -hide_banner -loglevel error -y -i $wayloRawVideo -i $wayloNarrationPath -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart $wayloFinalVideo
if ($LASTEXITCODE -ne 0) {
  throw "FFmpeg could not assemble the final MP4."
}

$wayloCaptionPath = Join-Path $wayloOutput "Waylo-Build-Week-Demo.en.srt"
$wayloCaptionLines = New-Object System.Collections.Generic.List[string]
$wayloCaptionStart = 0.0
$wayloCaptionIndex = 1
foreach ($wayloTiming in $wayloTimings) {
  $wayloSceneDuration = [double]$wayloTiming.durationSeconds
  $wayloSceneEnd = $wayloCaptionStart + $wayloSceneDuration
  $wayloSentences = @([regex]::Split([string]$wayloTiming.narration, "(?<=[.!?])\s+(?=[A-Z])") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $wayloCharacterTotal = ($wayloSentences | ForEach-Object { $_.Length } | Measure-Object -Sum).Sum
  $wayloSentenceStart = $wayloCaptionStart

  for ($wayloSentenceIndex = 0; $wayloSentenceIndex -lt $wayloSentences.Count; $wayloSentenceIndex++) {
    $wayloSentence = $wayloSentences[$wayloSentenceIndex]
    if ($wayloSentenceIndex -eq $wayloSentences.Count - 1) {
      $wayloSentenceEnd = $wayloSceneEnd
    }
    else {
      $wayloSentenceShare = [double]$wayloSentence.Length / [double]$wayloCharacterTotal
      $wayloSentenceEnd = $wayloSentenceStart + ($wayloSceneDuration * $wayloSentenceShare)
    }

    $wayloCaptionLines.Add([string]$wayloCaptionIndex)
    $wayloCaptionLines.Add((ConvertTo-WayloSrtTime -Seconds $wayloSentenceStart) + " --> " + (ConvertTo-WayloSrtTime -Seconds $wayloSentenceEnd))
    $wayloCaptionLines.Add($wayloSentence)
    $wayloCaptionLines.Add("")
    $wayloCaptionIndex++
    $wayloSentenceStart = $wayloSentenceEnd
  }

  $wayloCaptionStart = $wayloSceneEnd
}
[System.IO.File]::WriteAllLines($wayloCaptionPath, $wayloCaptionLines, $wayloUtf8)

$wayloFinalDuration = Get-WayloDurationSeconds -MediaPath $wayloFinalVideo
if ($wayloFinalDuration -ge 180) {
  throw "The rendered demo is $wayloFinalDuration seconds and exceeds the three-minute limit."
}

[pscustomobject]@{
  Video = $wayloFinalVideo
  Captions = $wayloCaptionPath
  DurationSeconds = [math]::Round($wayloFinalDuration, 2)
  Resolution = "1600x900"
  Voice = if ($wayloVoiceNames -contains "Microsoft Zira Desktop") { "Microsoft Zira Desktop" } else { $wayloVoiceNames[0] }
}
