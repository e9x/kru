# Sploit

|||||
| --- | --- | --- | --- | --- | --- |
| [Client Patcher](#patcher) | [Junker](#junker) | [Userscript](#userscript) | [Discord](https://e9x.github.io/kru/invite) | [Build quickstart](#building) | [IDKR script](sploit.idkr.js) |

# Resources:

## [Root folder](https://mega.nz/folder/PAcjzaYb#ITVrn9P7-0kRurX3MU969w)

[Archived versions](https://mega.nz/folder/eE9ghBzS#nw_TzAoWnK9Cz5Sry-lECw)

## Leaked source:

[Deflated](https://mega.nz/folder/OJEgjLIJ#YEyz7VsyyjauZarD8JLldg)

[Source](https://mega.nz/file/uMN0hRoA#iAktwPcSWg0uCEW1jSf7N8XZIIXKy9h-RB_MMFmzV04)

## Original variables source:

Obfuscator.io was used temporarily as a replacement of randomizing variables (for the input side of things), if you are looking to steal some functions or viewing them then this is the way to go about

[Beautified](https://mega.nz/file/vJF0XDwa#1fjDUjWyBmtwUU-dN28A1PQ37u9HCDFFz2NTlqm1Ab0) where properties such as canSee and canBSeen remain

[Non-obfuscated reference](https://mega.nz/file/uEVmALhZ#Vlb6A5hR8IotmKXNZ6MjBIkBoCaa3wZkBj0552ihE7Y)

# Building

To build the userscripts, you will need [NodeJS](https://nodejs.org/en/download/)

If you are on windows, download and unzip the repository and run `build.bat`

```sh
git clone https://github.com/e9x/kru.git sploit

cd sploit

npm install

node index.js -once
```

# Userscript

Install [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) then install the [Userscript](https://raw.githubusercontent.com/e9x/kru/master/sploit.user.js)

# Junker

[Greasyfork](https://greasyfork.org/en/scripts/424376-krunker-junker)

# Patcher

Pre-built binary found [here](https://e9x.github.io/kru/patcher/Patcher.exe).

## Building the patcher:

1. Clone this repository
`git clone https://github.com/e9x/kru.git

2. Enter the packer folder
`cd e9x/packer`

3. Install dependencies
`./!INSTALL_MODULES.cmd`

4. Test the app
`./!TEST_CLIENT.cmd`

5. Build the binaries
`./!BUILD_EXE.cmd`

Output in the `dist/` folder