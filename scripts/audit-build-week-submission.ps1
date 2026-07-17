param(
  [Parameter(Mandatory = $true)]
  [string]$PublicAppUrl,

  [Parameter(Mandatory = $true)]
  [string]$RepositoryUrl,

  [Parameter(Mandatory = $true)]
  [string]$YoutubeUrl,

  [Parameter(Mandatory = $true)]
  [string]$CodexSessionId,

  [Parameter(Mandatory = $true)]
  [string]$VideoPath,

  [Parameter(Mandatory = $true)]
  [string]$FfmpegPath,

  [switch]$PrivateRepositoryReviewerAccessConfirmed,
  [switch]$YoutubeVisibilityConfirmedPublic
)

$ErrorActionPreference = "Stop"
$wayloRepo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$wayloFailures = New-Object System.Collections.Generic.List[string]
$wayloPasses = New-Object System.Collections.Generic.List[string]

function Add-WayloGate {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][bool]$Passed,
    [Parameter(Mandatory = $true)][string]$Failure
  )

  if ($Passed) {
    $wayloPasses.Add($Name)
  }
  else {
    $wayloFailures.Add($Name + ": " + $Failure)
  }
}

function Get-WayloUrl {
  param([Parameter(Mandatory = $true)][string]$Value)
  try {
    return [System.Uri]$Value
  }
  catch {
    return $null
  }
}

function Get-WayloDurationSeconds {
  param(
    [Parameter(Mandatory = $true)][string]$MediaPath,
    [Parameter(Mandatory = $true)][string]$EncoderPath
  )

  $wayloPreviousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $wayloProbeText = (& $EncoderPath -hide_banner -i $MediaPath -f null - 2>&1 | Out-String)
  }
  finally {
    $ErrorActionPreference = $wayloPreviousPreference
  }

  $wayloDurationMatch = [regex]::Match($wayloProbeText, "Duration:\s*(?<hours>\d+):(?<minutes>\d+):(?<seconds>\d+(?:\.\d+)?)")
  if (-not $wayloDurationMatch.Success) {
    return $null
  }

  return ([double]$wayloDurationMatch.Groups["hours"].Value * 3600) +
    ([double]$wayloDurationMatch.Groups["minutes"].Value * 60) +
    [double]$wayloDurationMatch.Groups["seconds"].Value
}

$wayloAppUri = Get-WayloUrl -Value $PublicAppUrl
$wayloRepoUri = Get-WayloUrl -Value $RepositoryUrl
$wayloYoutubeUri = Get-WayloUrl -Value $YoutubeUrl

Add-WayloGate -Name "Public app URL is HTTPS" -Passed ($null -ne $wayloAppUri -and $wayloAppUri.Scheme -eq "https") -Failure "Provide the final HTTPS application URL."
Add-WayloGate -Name "Repository URL is HTTPS" -Passed ($null -ne $wayloRepoUri -and $wayloRepoUri.Scheme -eq "https") -Failure "Provide the final HTTPS repository URL."
Add-WayloGate -Name "YouTube URL is valid" -Passed ($null -ne $wayloYoutubeUri -and $wayloYoutubeUri.Scheme -eq "https" -and $wayloYoutubeUri.Host -match "(^|\.)youtube\.com$|(^|\.)youtu\.be$") -Failure "Provide the public YouTube URL."
Add-WayloGate -Name "YouTube visibility is manually confirmed Public" -Passed ([bool]$YoutubeVisibilityConfirmedPublic) -Failure "Open YouTube Studio and confirm Visibility is Public."
Add-WayloGate -Name "Codex feedback session ID is present" -Passed ($CodexSessionId -match "^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}$") -Failure "Run /feedback in the main build task and copy its session ID."

if ($wayloAppUri) {
  try {
    $wayloAppResponse = Invoke-WebRequest -UseBasicParsing -MaximumRedirection 10 -Uri $wayloAppUri.AbsoluteUri
    $wayloAppText = [string]$wayloAppResponse.Content
    Add-WayloGate -Name "Application is available logged out" -Passed ($wayloAppResponse.StatusCode -eq 200 -and $wayloAppText.Contains("See what changes before you change your plan.")) -Failure "The logged-out response must be HTTP 200 and contain the Waylo landing proof."
  }
  catch {
    Add-WayloGate -Name "Application is available logged out" -Passed $false -Failure $_.Exception.Message
  }
}

if ($PrivateRepositoryReviewerAccessConfirmed) {
  Add-WayloGate -Name "Private repository reviewer access is attested" -Passed $true -Failure ""
}
elseif ($wayloRepoUri) {
  try {
    $wayloRepoResponse = Invoke-WebRequest -UseBasicParsing -MaximumRedirection 10 -Uri $wayloRepoUri.AbsoluteUri
    Add-WayloGate -Name "Repository is publicly reachable" -Passed ($wayloRepoResponse.StatusCode -eq 200) -Failure "Make the repository public or rerun with -PrivateRepositoryReviewerAccessConfirmed after sharing both required reviewer accounts."
  }
  catch {
    Add-WayloGate -Name "Repository is publicly reachable" -Passed $false -Failure "Make the repository public or share testing@devpost.com and build-week-event@openai.com, then use the explicit attestation switch."
  }
}

if ($wayloYoutubeUri) {
  try {
    $wayloEncodedVideoUrl = [System.Uri]::EscapeDataString($wayloYoutubeUri.AbsoluteUri)
    $wayloOembedUrl = "https://www.youtube.com/oembed?format=json&url=" + $wayloEncodedVideoUrl
    $wayloYoutubeResponse = Invoke-WebRequest -UseBasicParsing -MaximumRedirection 10 -Uri $wayloOembedUrl
    Add-WayloGate -Name "YouTube video is playable without authentication" -Passed ($wayloYoutubeResponse.StatusCode -eq 200) -Failure "The YouTube oEmbed endpoint could not resolve the submitted video."
  }
  catch {
    Add-WayloGate -Name "YouTube video is playable without authentication" -Passed $false -Failure $_.Exception.Message
  }
}

$wayloResolvedVideo = Resolve-Path -LiteralPath $VideoPath -ErrorAction SilentlyContinue
$wayloResolvedEncoder = Resolve-Path -LiteralPath $FfmpegPath -ErrorAction SilentlyContinue
Add-WayloGate -Name "Final video file exists" -Passed ($null -ne $wayloResolvedVideo) -Failure "Provide the final rendered MP4."
Add-WayloGate -Name "FFmpeg exists for media verification" -Passed ($null -ne $wayloResolvedEncoder) -Failure "Provide the FFmpeg executable used by the render pipeline."

if ($wayloResolvedVideo -and $wayloResolvedEncoder) {
  $wayloDuration = Get-WayloDurationSeconds -MediaPath $wayloResolvedVideo.Path -EncoderPath $wayloResolvedEncoder.Path
  Add-WayloGate -Name "Video is under three minutes" -Passed ($null -ne $wayloDuration -and $wayloDuration -lt 180) -Failure "The final video must be shorter than 180 seconds."
}

$wayloValidationPath = Join-Path $wayloRepo "docs\HUMAN_VALIDATION.md"
$wayloValidationText = Get-Content -Raw -LiteralPath $wayloValidationPath
$wayloPendingParticipant = $wayloValidationText -match "\| P[123] \| Pending"
Add-WayloGate -Name "Three human validation records are complete" -Passed (-not $wayloPendingParticipant) -Failure "Replace every pending P1-P3 row with direct observations from real sessions."

$wayloSafeRepo = $wayloRepo.Replace("\", "/")
$wayloPreviousGitPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  $wayloBranchOutput = @(git -c ("safe.directory=" + $wayloSafeRepo) rev-parse --abbrev-ref HEAD 2>$null)
  $wayloGitContextOk = $LASTEXITCODE -eq 0 -and $wayloBranchOutput.Count -gt 0
  Add-WayloGate -Name "Git repository context is readable" -Passed $wayloGitContextOk -Failure "Run the auditor from the Waylo checkout and verify Git safe-directory access."

  if ($wayloGitContextOk) {
    $wayloBranch = [string]$wayloBranchOutput[0]
    $wayloHeadOutput = @(git -c ("safe.directory=" + $wayloSafeRepo) rev-parse HEAD 2>$null)
    $wayloHeadOk = $LASTEXITCODE -eq 0 -and $wayloHeadOutput.Count -gt 0
    $wayloRemoteOutput = @(git -c ("safe.directory=" + $wayloSafeRepo) rev-parse ("origin/" + $wayloBranch) 2>$null)
    $wayloRemoteOk = $LASTEXITCODE -eq 0 -and $wayloRemoteOutput.Count -gt 0
    $wayloStatus = @(git -c ("safe.directory=" + $wayloSafeRepo) status --porcelain 2>$null)
    $wayloStatusOk = $LASTEXITCODE -eq 0

    Add-WayloGate -Name "Repository worktree is clean" -Passed ($wayloStatusOk -and $wayloStatus.Count -eq 0) -Failure "Commit or remove all local changes before submission."
    Add-WayloGate -Name "Local and remote branch heads match" -Passed ($wayloHeadOk -and $wayloRemoteOk -and [string]$wayloHeadOutput[0] -eq [string]$wayloRemoteOutput[0]) -Failure "Push the exact judged revision before submission."
  }
}
finally {
  $ErrorActionPreference = $wayloPreviousGitPreference
}

Write-Output ("Passed gates: " + $wayloPasses.Count)
$wayloPasses | ForEach-Object { Write-Output ("  PASS  " + $_) }

if ($wayloFailures.Count) {
  Write-Output ("Failed gates: " + $wayloFailures.Count)
  $wayloFailures | ForEach-Object { Write-Output ("  FAIL  " + $_) }
  exit 1
}

Write-Output "BUILD WEEK SUBMISSION GATE: PASS"
