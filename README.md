# FTVDB

FTVDB is an independent, community-maintained catalog of public update metadata for Amazon devices. It preserves full firmware, incremental firmware, and system component version history for Fire TV, Fire Tablet, Echo, and Kindle devices in a structured public database.

> [!IMPORTANT]
> FTVDB stores metadata and links only. It does not host, mirror, modify, proxy, or distribute firmware images, system component packages, APK files, or other update binaries.
>
> FTVDB is not affiliated with, endorsed by, or sponsored by Amazon.com, Inc. or any of its subsidiaries.

## Explore FTVDB

- [Browse firmware metadata](https://ftvdb.com/firmware/)
- [Browse system component metadata](https://ftvdb.com/apps/)
- [Submit a public source URL](https://ftvdb.com/submit/)
- [Use the public submission API](https://ftvdb.com/api/)
- [Read the submission manual](https://ftvdb.com/manual/)
- [Follow project updates on Telegram](https://t.me/FTVDB)

## Maintainer

FTVDB was founded in 2020 by Ighor July and is independently maintained.

- Read software research, investigations, and practical technical writing at [Reverse Everything](https://reverseeverything.com/?utm_source=ftvdb)
- Explore original [apps by Ighor July](https://reverseeverything.com/apps/?utm_source=ftvdb)

## What the database contains

FTVDB records information needed to identify and understand public device updates over time.

- Device family, model, display name, and package identifier
- Version name and numeric version code
- Full and diff firmware package records, stored separately
- Starting build for diff firmware when recorded
- Date recorded by the catalog
- MD5 checksum retained as a record identifier
- Public source URL when the contributor has not requested an opt-out
- References for contributor opt-outs

Source URLs point to external systems that FTVDB does not operate or control. A listed source can change or become unavailable. The presence of a record is documentation, not a recommendation to download or install a file.

FTVDB does not collect or publish update binaries, device backups, private logs, credentials, account data, access tokens, or URLs that require bypassing access controls.

## Repository layout

| Path | Purpose |
| --- | --- |
| [`database/categories.json`](database/categories.json) | Supported device families and their metadata |
| [`database/firmware.json`](database/firmware.json) | Full firmware package index with device category, model, and display names |
| [`database/firmware/`](database/firmware/) | Full firmware version records grouped by package identifier |
| [`database/firmware-diff.json`](database/firmware-diff.json) | Incremental firmware package index using the same device metadata format |
| [`database/firmware-diff/`](database/firmware-diff/) | Diff firmware version records grouped by package identifier |
| [`database/apps.json`](database/apps.json) | System component package index and display names |
| [`database/apps/`](database/apps/) | Version records grouped by system component package identifier |
| [`database/optouts.json`](database/optouts.json) | Public references associated with contributor opt-outs |

Both firmware indexes map a bundle identifier to device metadata with `category`, `model`, and `title` fields. The `title` field is an array of display names. Matching records are stored in `database/firmware/<bundle>.json` for full packages and `database/firmware-diff/<bundle>.json` for diff packages. A device can appear in either or both indexes.

Each package file contains an array of version records. Full firmware and system component records use the following fields.

```json
[
  {
    "md5": "0123456789abcdef0123456789abcdef",
    "uploaded": "2026-01-01",
    "url": "https://example.com/public-update.bin",
    "versionCode": "123456789",
    "versionName": "Example OS 1.2.3"
  }
]
```

The `uploaded` field is the date stored by the catalog. Contributor opt-outs apply to full firmware, diff firmware, and system component records. An opted-out record can include an `optout` reference and an empty `url`. MD5 values are preserved for record matching and should not be treated as a modern security guarantee.

## Full and diff firmware

Full firmware records describe complete update packages. Diff firmware records describe incremental packages that contain changes for a particular starting build. Keep the package type and starting build associated with each diff record when interpreting its compatibility.

For firmware records, `versionCode` identifies the target build. `versionName` retains the catalog's version label, which can describe both the starting and target versions. Diff records use the same fields as full records and may also include `fromVersionCode` for the required starting build.

This illustrative diff record includes that optional field.

```json
[
  {
    "md5": "fedcba9876543210fedcba9876543210",
    "uploaded": "2026-01-01",
    "url": "https://example.com/public-update-diff.bin",
    "fromVersionCode": "123456700",
    "versionCode": "123456789",
    "versionName": "Example OS 1.2.3"
  }
]
```

Many diff records do not include `fromVersionCode`. The website uses this field when present and otherwise attempts to read the starting build from supported source URL filename patterns. If neither supplies a starting build, it remains unknown. Preserve version codes as strings to retain their exact values.

Several diff packages can lead to the same target build from different starting builds. Keep those package records separate rather than deduplicating only by `versionCode` or `versionName`.

On [ftvdb.com](https://ftvdb.com/), device histories offer **Full firmware** and **Diff firmware** views when diff records are available. Full histories use `/{category}/firmware/{bundle}/`, and diff histories use `/{category}/firmware/{bundle}/diff/`. The diff history shows the starting build when it can be identified alongside the target build.

## How it works

1. Contributors report publicly reachable update source URLs observed through normal diagnostics on devices they own or maintain.
2. Submitted URLs are validated and reviewed before accepted metadata is added to the catalog.
3. The structured records are published here and presented through [ftvdb.com](https://ftvdb.com).

The project exists for documentation, repair research, software history, and preservation of public update metadata. It does not promote piracy, firmware downgrades, rooting, jailbreaking, or bypassing device security.

## Using the data

The website is the easiest way to browse the catalog. Developers and researchers can also read the [published JSON database](database/) directly. Read both firmware indexes to discover all recorded devices, including those with only diff records, and load each bundle from the matching full or diff directory. System component records remain in `apps.json` and `apps/`. The [public API](https://ftvdb.com/api/) accepts new source URL submissions and does not serve database records.

Treat all external source URLs and metadata as untrusted input. Verify accuracy, compatibility, authenticity, and safety independently before relying on any record. FTVDB does not guarantee that a record is complete, current, available, or suitable for a particular use.

Attribution is appreciated when FTVDB data is used in public research, documentation, software, or release notes. Please credit [ftvdb.com](https://ftvdb.com).

## Contributing

The preferred way to contribute a newly observed URL is through the [submission page](https://ftvdb.com/submit/). Regular contributors can use the [API](https://ftvdb.com/api/).

Only submit public, unauthenticated source URLs observed from devices you own or maintain. Do not submit or attach update binaries, private logs, credentials, account data, personal information, tokens, or locations obtained by bypassing access controls.

- Open a [GitHub issue](https://github.com/FTVDB/FTVDB/issues) for a metadata correction, broken project link, or repository problem
- Submit a pull request for a verifiable database correction or documentation improvement
- Include enough public context to review a correction without exposing private or personal data

## Rights-holder and contributor requests

Rights holders can review the [DMCA and content removal process](https://ftvdb.com/dmca/) or email [support@ftvdb.com](mailto:support@ftvdb.com). Contributors can use the same address for attribution or opt-out requests. General contact options are listed on the [contact page](https://ftvdb.com/contact/).

Requests are reviewed against the public record and the project policies. See the [terms of use](https://ftvdb.com/terms/) for the full project scope, acceptable use rules, disclaimers, and removal process.

Amazon, Fire TV, Fire, Echo, Kindle, and related names and marks belong to their respective owners. Their appearance identifies the devices and metadata covered by this independent reference project.

## License

This repository is provided under the [MIT License](LICENSE).
