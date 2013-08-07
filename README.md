# Make Titanium app changes without restarting the iOS simulator

Normally a code change requires a restart of the iOS simulator.
To make the developing a little faster, this tool will do the same without the simulator restart.

## How it works
The tool does the following:

1. Run your pre-compile hooks (if you have any)
2. Use the ios-sim tool to restart your app in the simulator
3. Show the log file output

## Usage
Install the tool using npm: `npm install -g titanium-refresh`

Execute it from the terminal: `titanium-refresh`

Command line options:
* `-d` the directory of the Titanium project
* `-I` the version of the iOS simulator to run
* `-h` help

## When it works
This is a pretty simple tool I created for myself so there are several limitations including:
* Your app has to have a debug simulator build already available
* Your changes cannot require a new XCode build

## Caveats
Things to keep in mind for this early version
* I've only tested it on a Mac
* I've only tested it on my own projects
* This should really be functionality built into the titanium command line or a plug-in

## License
Copyright 2013 Front Seat LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Disclaimers
This is a tool created for our own internal use. It is **not supported** by Appcelerator. If you have questions, issues, etc. then please file them in the GitHub Issues section of the repository. Even better, fork the project and make it better :)

## Sponsorship
This project brought to you by [Front Seat](http://frontseat.org)
<div style='position:relative;top:5px;left:10px'>
<img src="http://frontseat.org/images/front-seat-logo.gif">
</div>
<div>
<img src="http://frontseat.org/images/front-seat-banner.gif">
</div>
