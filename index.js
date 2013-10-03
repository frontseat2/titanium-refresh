#!/usr/bin/env node

var child_process = require('child_process');
var path = require('path');
var fs = require('fs');
var xml2js = require('xml2js');
var optimist = require('optimist');
var utils = require('./utils');

//
// Constants
//
var TIAPP_XML = "tiapp.xml";
var APP_SUFFIX = ".app";
var LOG_SUFFIX = ".log";
var IOS_SIM_EXE = "ios-sim";

var TITANIUM_SDK_USER_PATH = "Library/Application Support/Titanium/mobilesdk/osx";
var IOS_SIM_USER_PATH = "Library/Application Support/iPhone Simulator/";

var TITANIUM_HOOKS_PROJECT_PATH = "plugins";
var TITANIUM_BUILD_PROJECT_PATH = "build/iphone/build/Debug-iphonesimulator/";

var APPS_SIM_PATH = "Applications";


// Read tiapp.xml
function getTiAppSettings(projectDir, cb) {
  fs.readFile(path.join(projectDir, TIAPP_XML), function(err, data) {
    if (err) { return cb(err); }
    var parser = new xml2js.Parser();
    parser.parseString(data, cb);
  });
}

// simulate titanium to run all the pre-compile hooks
function preCompileApp(paths, plugins, fnDone) {
  // Simulate titanium vars
  var logger = {
    info: function(s) { console.log(s); },
    error: function(s) { console.log(s); },
    trace: function(s) { console.log(s); }
  };
  var cli = {
    'project-dir': paths.projectDir,
    hooks: {},
    addHook: function(hookName, fnHook) {
      this.hooks[hookName] = fnHook;
    }
  };
  var build = {
    projectDir: cli['project-dir']
  };
  var config = null;
  var appc = null;

  // Run pre-compile hooks
  // TODO: respect multiple existing versions of the plugin existing & version specified in tiapp.xml
  utils.eachAsync(plugins, function(plugin, cb) {
    try {
      var buildHooks = require(path.join(paths.projectHooksDir, plugin, "1.0", "hooks"));
      buildHooks.init(logger, config, cli, appc);
      cli.hooks['build.pre.compile'](build, function() { cb(null); });
    } catch(err) {
      cb(err);
    }
  }, fnDone);
}

// Launch the app in the simulator
function launchApp(paths, iosSimSdkVersion, cb) {
  function getSimParams(cwd) {
    var iosSimParams = [
      "launch", paths.app,
      "--sdk", iosSimSdkVersion,
      "--family", "iphone",
      "--exit"
    ];
    return iosSimParams.join(" ");
  }

  // change to the directory of the simulator
  var curDir = process.cwd();
  var titaniumPath = path.join(paths.titaniumSdkDir, "iphone");
  process.chdir(titaniumPath);

  // launch the simulator
  console.log("Launching simulator");
  var iosSimProcess = child_process.exec(IOS_SIM_EXE + " " + getSimParams(curDir), function(err, stdout, stderr) {
    if (err) { console.log(err); }
    if (stderr) { console.log(stderr); }
    if (err) { return cb(err); }
    cb(null);
  });

  // go back to original directory
  process.chdir(curDir);
}

// Monitor and display the log file
function monitorLog(paths, cb) {

  // hunt through the apps in the simulator to find which one has our binary
  function findAppDir(cb) {
    var validAppPaths = [];
    var filenames = fs.readdirSync(paths.iosSimulatorAppsDir);
    var pathsChecked = 0;
    utils.each(filenames, function(filename) {
      var appPath = path.join(paths.iosSimulatorAppsDir, filename);
      fs.readdir(appPath, function(err, files) {
        if (!err && files.indexOf(path.basename(paths.app)) > -1) {
          validAppPaths.push(appPath);
        }
        if (++pathsChecked === filenames.length) {
          if (validAppPaths.length === 1) {
            cb(null, validAppPaths[0]);
          } else {
            cb(new Error('Found invalid number of apps: ' + validAppPaths.length));
          }
        }
      });
    });
  }

  // find the app directory
  findAppDir(function(err, appDir) {
    if (err) {
      return cb(err);
    }

    // remove old log files
    var logDir = path.join(appDir, "Documents");
    var docFiles = fs.readdirSync(logDir);
    var logFiles = utils.filter(docFiles, function(file) { return utils.stringEndsWith(file, LOG_SUFFIX); });
    utils.eachAsync(logFiles, function(logFile, cb) {
      var logFilePath = path.join(logDir, logFile);
      console.log("Removing old log file " + logFilePath);
      fs.unlink(logFilePath, cb);
    }, function(err) {
      if (err) { return cb(err); }

      // find remaining log files
      // TODO: using setTimeout to wait for the simulator to appear and the logfile to be created isn't reliable
      function watchLogFile() {
        var docFiles = fs.readdirSync(logDir);
        var logFiles = utils.filter(docFiles, function(file) { return utils.stringEndsWith(file, LOG_SUFFIX); });

        // show the log
        if (logFiles.length === 1) {
          console.log("Showing logfile");
          var logFile = path.join(logDir, logFiles[0]);
          var prevStart = 0;
          fs.watchFile(logFile, {
            persistent: true,
            interval: 200
          }, function(curr, prev) {
            var filePipe = fs.createReadStream(logFile, {
              start: prevStart
            });
            filePipe.pipe(process.stdout);
            prevStart = curr.size;
          });
          cb(null);
        } else if (logFiles.length === 0) {
          console.log("Waiting for logfile...");
          setTimeout(watchLogFile, 100);
        } else {
          cb(new Error("Invalid number of log files " + logFiles.length));
        }
      }

      watchLogFile();
    });
  });
}

// Main
(function() {
  // Command line processing
  var argv = optimist
    .usage('Restart your iOS Titanium app without rebooting the simulator')
    .describe('d', 'Titanium project directory')
    .default('d', '.')
    .alias('d', 'project-dir')
    .describe('I', 'iOS SDK simulator version')
    .default('I', '6.1')
    .alias('I', 'ios-version')
    .boolean(['h', '?', 'help'])
    .argv;

  // Handle help
  if (argv.h || argv.help || argv['?']) {
    return optimist.showHelp();
  }

  // Settings we'll use
  var paths = {};
  paths.projectDir = path.resolve(argv.d);
  paths.projectHooksDir = path.join(paths.projectDir, TITANIUM_HOOKS_PROJECT_PATH);
  paths.buildDir = path.join(paths.projectDir, TITANIUM_BUILD_PROJECT_PATH);

  paths.iosSimulatorDir = path.resolve(process.env['HOME'], IOS_SIM_USER_PATH, argv.I);
  paths.iosSimulatorAppsDir = path.join(paths.iosSimulatorDir, APPS_SIM_PATH);

  var plugins = [];

  utils.asyncSeries([
    // Get the Ti app settings
    function(cb) {
      getTiAppSettings(paths.projectDir, function(err, settings) {
        if (err) { return cb(err); }
        if (settings['ti:app']) {
          // add paths
          if (settings['ti:app']['name'] && settings['ti:app']['name'].length > 0) {
            paths.app = path.join(paths.buildDir, settings['ti:app'].name[0] + APP_SUFFIX);
          }

          if (settings['ti:app']['sdk-version'] && settings['ti:app']['sdk-version'].length > 0) {
            paths.titaniumSdkDir = path.resolve(process.env['HOME'], TITANIUM_SDK_USER_PATH, settings['ti:app']['sdk-version'][0]);
          }

          // store plugins
          if (settings['ti:app']['plugins'] && settings['ti:app']['plugins'].length > 0) {
            utils.each(settings['ti:app']['plugins'], function(plugin) {
              if (plugin['plugin'] && plugin['plugin'].length > 0) {
                plugins.push(plugin['plugin'][0]);
              }
            });
          }
        }

        if (!paths.app || !paths.titaniumSdkDir) {
          cb(new Error('Cannot process tiapp.xml'));
        } else {
          cb(null);
        }
      });
    },

    // Compile and launch the app
    function(cb) { preCompileApp(paths, plugins, cb); },
    function(cb) { launchApp(paths, argv.I, cb); },
    function(cb) { monitorLog(paths, cb); }
  ], function(err) {
    if (err) {
      optimist.showHelp();
      console.log("ERROR: " + err);
      process.exit(1);
    }
  });
})();
