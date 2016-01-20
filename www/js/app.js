// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('app', ['ionic', 'ngCordova', 'app.controllers', 'app.routes', 'app.services', 'app.directives'])

.run(function ($ionicPlatform, $ionicPopup, $localstorage, $rootScope, $cordovaNetwork, $state, multibatch_uploader) {
    $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }

        //Adds listener to start WI-FI upload
        $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
            console.log("online")
            if ($cordovaNetwork.getNetwork() == Connection.WIFI) {
                console.log("wifi detected, attempting upload")
                var json_array = $localstorage.getArray('metadata_filenames')
                if (json_array.length > 1) {
                    console.log("files found, beginning upload")
                    multibatch_uploader.doit(json_array);
                    var metadata_filenames = new Array;
                    $localstorage.setArray('metadata_filenames', metadata_filenames)
                } else {
                    console.log("nothing to upload for now")
                }
            }
        })
        
        
        //Locks screen orientation
        screen.lockOrientation('portrait');
        
        //Starts analytics
        if(analytics != undefined) {
                analytics.startTrackerWithId("UA-72647228-1");
            } else {
                console.log("Google Analytics Unavailable");
            }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }


    });
}).config(function ($ionicConfigProvider) {
    $ionicConfigProvider.views.maxCache(0);
});