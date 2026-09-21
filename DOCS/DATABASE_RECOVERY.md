# Database Recovery

## Current Status

- As of 2026-09-21, the current evidence came from read-only checks only. No production write or backup operation was performed.
- The canonical live Leenya project is `ieuhknpdhjvuuwtpsguw`.
- As of 2026-09-21, the repository config points to the canonical project `ieuhknpdhjvuuwtpsguw` per owner confirmation. The canonical project remains the MCP-connected production project.
- The free plan does not provide automatic backups or point-in-time recovery, according to the owner.
- Supabase CLI `2.101.0` is installed.
- Docker `29.7.2` is installed, but the Docker daemon was not running during the check.
- The repository contains 6 migration files, while the live project history contains 76 records. The repository is not a complete recovery record for the live database.
- No backup has been created as part of this task.

The following work is not yet completed:

- A schema pull and comparison against the live project.
- Grants, policies, and publication evidence.
- A disposable local database restore and verification.

## Backup Metadata

- Backup created: yes — verified 2026-09-21 by owner
- Files: `leenya-live-schema.sql` (68,613 bytes) and `leenya-live-data.sql` (32,135 bytes) in `C:\Users\DELL\Desktop\Sifeddine\leenya-recovery-work` (outside this repository, file permissions restricted to the owner)
- SHA-256 fingerprints:
  - `leenya-live-schema.sql`: `2F50BE4DB9B70411947FA2DB19D0143B84BF0EEAABE3BE0D40B3D972BCBBAC79`
  - `leenya-live-data.sql`: `F60CAA728BD1AFA4B0FD49E29034510D8C0BA5B9B8C20D225C90E8533277B72D`
- Region: documented as `EU-West-3` in existing project records; the owner must verify this
- Plan: free, according to the owner
- PITR/daily backup status: not independently confirmed

The hashes above are one-way fingerprints, not secrets. Re-running `Get-FileHash` on these files must reproduce them exactly; a mismatch means the backup changed or is corrupt and must not be trusted for restore.

## Safety Rules

- Do not run production writes, schema changes, resets, pushes, or migrations until a live export has been verified.
- Do not run `supabase link` from this checkout unless the owner explicitly approves changing its project setting.
- Use the canonical project ID above. Never substitute the project ID currently in the repository config.
- Keep the database password and access token out of files, commits, screenshots, and chat logs.
- Do not treat the repository migration files as a backup.

The gate is strict: no production writes happen until either a verified logical export exists or a confirmed restore point is available. Owner approval alone is not a substitute for one of these two recovery options.

## Pre-Write Checklist

Before any production write, the owner must confirm all of the following:

- The backup metadata above is still accurate, including the region.
- The current backup and PITR/daily backup status has been confirmed in the project.
- A verified logical export exists, or a confirmed restore point is available.
- The owner has confirmed which recovery procedure will be used: the logical dump process below or dashboard PITR.
- The restore target and restore steps have been tested or reviewed without targeting the live database by mistake.

## Owner-Run Export

Run these commands in a temporary folder outside the repository. This keeps the repository configuration untouched. PowerShell commands are shown for Windows.

```powershell
New-Item -ItemType Directory -Force "$env:TEMP\leenya-recovery-work" | Out-Null
Set-Location "$env:TEMP\leenya-recovery-work"
supabase init

try {
  # Read the token only in this shell. Do not put secrets in scripts or command arguments.
  $env:SUPABASE_ACCESS_TOKEN = Read-Host "Enter the Supabase access token"

  # These commands prompt for the database password. Do not add it to the command line,
  # because command arguments can be visible in process lists and shell history.
  supabase link --project-ref ieuhknpdhjvuuwtpsguw
  New-Item -ItemType Directory -Force .\exports | Out-Null
  supabase db dump --linked --file .\exports\leenya-live-schema.sql
  supabase db dump --linked --data-only --file .\exports\leenya-live-data.sql
  icacls "$PWD\exports\*" /inheritance:r /grant:r "$([System.Security.Principal.WindowsIdentity]::GetCurrent().Name):(F)" "BUILTIN\Administrators:(F)" /T
} finally {
  Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
}
```

The access token authorizes the CLI to use the Supabase project. The password prompts authorize the link and database export. Do not replace the project ID with the one in the repository config. The `finally` block removes the access token even when a command fails.

## Verify the Export

Run these checks before any production write:

```powershell
Get-Item .\exports\leenya-live-schema.sql, .\exports\leenya-live-data.sql | Format-Table Name, Length, LastWriteTime
Get-FileHash .\exports\leenya-live-schema.sql -Algorithm SHA256
Get-FileHash .\exports\leenya-live-data.sql -Algorithm SHA256
```

Verification passes only when both files exist, have non-zero sizes, and their SHA-256 hashes are recorded somewhere safe. Do not print the SQL contents. A successful command alone is not proof that a usable export exists.

## Protect the Export

- Store the plain-text SQL files only in an approved private location with access restricted to the owner and recovery operators.
- Encrypt the files at rest and use encrypted transfer when moving them. Do not email them, upload them to a public drive, or commit them to the repository.
- Record who can access the files and keep the access list as small as possible.
- Set a retention date based on the owner's recovery policy. Delete the files and any copies securely when they are no longer needed.
- Treat file names, hashes, logs, connection strings, passwords, and access tokens as sensitive recovery information.

For a Windows-only recovery folder, apply a restrictive local access list after creating it. This grants access to the current user and local administrators and removes inherited access:

```powershell
$exportDir = (Resolve-Path .\exports).Path
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $exportDir /inheritance:r
icacls $exportDir /grant:r "$($currentUser):(OI)(CI)(F)" "BUILTIN\Administrators:(OI)(CI)(F)"
```

Check the result with `icacls $exportDir`. Use full-disk encryption, an encrypted private backup location, and encrypted transfer for copies. Keep only the copies required by the retention policy, then securely delete the SQL files, hashes, and copies when the retention period ends.

## Restore a Logical Dump Later

This is a future procedure for a verified export. It does not restore anything now. Restore into a new, disposable Supabase project first, not plain Postgres, so database behavior and platform integration can be tested realistically.

1. Create or select a new, disposable Supabase project and get its database connection details. Do not use the live project or a plain Postgres database.
2. Confirm the destination project name, project reference, and database host in the Dashboard. Compare the reference and host against the live project before restoring. Stop if either matches:

```powershell
$liveProjectRef = "ieuhknpdhjvuuwtpsguw"
$liveDatabaseHost = Read-Host "Enter the confirmed live database host from the Dashboard"
$destinationProjectName = Read-Host "Enter the confirmed destination Supabase project name"
$destinationProjectRef = Read-Host "Enter the confirmed destination Supabase project reference"
$destinationDatabaseHost = Read-Host "Enter the confirmed destination database host"
if ($destinationProjectRef -eq $liveProjectRef) {
  throw "Refusing to restore into the live project."
}
if ($destinationDatabaseHost -eq $liveDatabaseHost) {
  throw "Refusing to restore to the live database host."
}
Write-Host "Confirmed destination: $destinationProjectName ($destinationProjectRef) at $destinationDatabaseHost"
```

3. Use `psql` with the destination connection string. Leave the password out of the connection string so `psql` prompts for it. Restore schema and data in one transaction. `ON_ERROR_STOP` and the exit-code check prevent a partial restore from being treated as successful:

```powershell
$destinationDbUrl = "<destination-postgres-connection-string-without-password>"

psql --dbname $destinationDbUrl --single-transaction --set ON_ERROR_STOP=1 --file .\exports\leenya-live-schema.sql --file .\exports\leenya-live-data.sql
if ($LASTEXITCODE -ne 0) { throw "Schema and data restore failed; do not use the destination project." }
```

The destination connection string must be for the confirmed disposable Supabase project, not the live database by accident. Review the `psql` output for errors, then verify tables, row counts, functions, and application access before considering the restore usable. Keep the password and connection string out of files and logs.

## Recovery Outside the SQL Dump

A logical database dump does not restore platform services or settings. Handle these separately and do not assume they are included in the SQL files:

- Auth users, Auth settings, and Auth metadata: verify the recovery method with the owner and check the disposable project's Auth configuration separately.
- Storage metadata, including buckets and access rules: verify and recreate bucket definitions and permissions separately.
- Storage files: inventory the required files and restore them through Storage separately. Database restore does not restore file contents.
- Project settings: record and reapply required project-level settings separately.
- Edge Function secrets: re-enter or rotate them separately; they are not in the SQL dump.
- Environment variables: inventory each environment and re-add values through the approved project settings process; they are not in the SQL dump.

## Restore From PITR After Upgrade

If the project is upgraded and PITR is enabled, use the Supabase Dashboard rather than the logical dump:

1. Open the canonical project `ieuhknpdhjvuuwtpsguw` in the Supabase Dashboard.
2. Open the database backup or PITR controls and confirm that PITR is active and that the desired restore time is available.
3. Select the required restore point and follow the Dashboard confirmation steps. Review the project ID, timestamp, and warning about replacing current database state before confirming.
4. After the restore completes, verify the database, authentication, Storage file contents separately, and application behavior before reopening production writes.

PITR availability and the exact Dashboard controls depend on the project's plan and current Supabase settings. Do not assume PITR or daily backups exist until the owner confirms them.

## Start Local Docker for Local Testing Only

Start Docker Desktop and wait until it reports that the engine is running. Then verify it with:

```powershell
docker version
supabase start
```

Local Docker is for local testing only. It can help test application behavior, but it does not create an automatic backup of the live project and is not a substitute for a disposable Supabase restore test.
