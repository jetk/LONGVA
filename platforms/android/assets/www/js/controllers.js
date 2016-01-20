angular.module('app.controllers', [])

.controller('loginCtrl', function ($scope, LoginService, $ionicPopup, $state, $localstorage) {

    //data object for user input
    $scope.data = {};
    var metadata_filenames = new Array;
    
    
    //checks if we are not running for the first time and jumps to main menu
    if ($localstorage.get('firstrun') == "false") {
        $state.go('mainMenu')
    }

    //linked to login button in view
    $scope.login = function () {
        
        //sends a login request to LoginService
        LoginService.loginUser($scope.data.username, $scope.data.password, $scope.data.instance).success(function (data) {
            //if succesful, goes to settings page and sets user credentials in local storage for recording naming
            $state.go('settings');
            $localstorage.set('uid', $scope.data.username);
            $localstorage.set('instance', $scope.data.instance);
            $localstorage.set('password', $scope.data.password);
            $localstorage.setArray('metadata_filenames', metadata_filenames)
        }).error(function (data) {
            //pops up a styled alert
            var alertPopup = $ionicPopup.alert({
                title: 'Login failed!',
                template: 'Please check your credentials!'
            });
        });

    }
})

.controller('mainMenuCtrl', function ($scope, $state, $http, $localstorage, $rootScope, $cordovaNetwork, $cordovaFile, multibatch_uploader) {
    //jumps to pre-recording question
    $scope.alpha = function () {
        $state.go('prerecord')
    }


    //Checks if data exists already, only loads if not (to prevent saving over old names)
    if (JSON.stringify($localstorage.getObject('recording_names')) == "{}") {
        $http.get('js/qdata.json').success(function (data) {
            $localstorage.setObject('question_json', data)
            $localstorage.setObject('recording_names', data[0]['Q_Text'])
            alert("data initialised")
        })
    }

})

.controller('settingsCtrl', function ($scope, $localstorage, $state, $cordovaLocalNotification) {

    //pulls in a firstrun boolean, used to determine whether the 'save' or 'update' buttons are visible	
    $scope.firstrun = $localstorage.get('firstrun')
    
    
    //Linked to inputs in view, but updated with saved times
    $scope.settings = {
        WDAM: new Date($localstorage.get('WDAM')), //morning reminder
        WDPM: new Date($localstorage.get('WDPM')), //evening reminder
        //WEAM: '', left in for eventual upgrade to weekday/weekend reminders
        //WEPM: ''  left in for eventual upgrade to weekday/weekend reminders
    };

    //sets button text in view depending on if it's the first run or not
    ($scope.firstrun) ? $scope.button_text = "UPDATE SETTINGS": $scope.button_text = "SAVE SETTINGS"


    var generate_times = function () {
        //saves to localstorage in case reminders fail and for displaying saved times
        $localstorage.set('WDAM', $scope.settings.WDAM)
        $localstorage.set('WDPM', $scope.settings.WDPM)

        /*
        Left in for eventual upgrade to weekday/weekend reminders
        $localstorage.set('WEAM', $scope.settings.WEAM)
        $localstorage.set('WEPM', $scope.settings.WEPM)
		*/

        //Creates components for alarm datetime
        var dd = new Date().getDate();
        var mm = new Date().getMonth() + 1;
        var yy = new Date().getFullYear();

        //extracts AM reminder hour and minutes
        var AMhh = new Date($scope.settings.WDAM).getHours();
        var AMmm = new Date($scope.settings.WDAM).getMinutes();

        //extracts PM reminder hour and minutes
        var PMhh = new Date($scope.settings.WDPM).getHours();
        var PMmm = new Date($scope.settings.WDPM).getMinutes();

        //Generates correctly formatted string for closest AM reminder time and turns it into a datetime
        var AMsource = yy + ',' + mm + ',' + dd + ' ' + AMhh + ':' + AMmm;
        var AM_datetime = new Date(AMsource);

        //Generates correctly formatted string for closest PM reminder time and turns it into a datetime
        var PMsource = yy + ',' + mm + ',' + dd + ' ' + PMhh + ':' + PMmm;
        var PM_datetime = new Date(PMsource);

        //Returns an object with the datetimes for use in the save and update functions
        return {
            "WDAM": AM_datetime,
            "WDPM": PM_datetime
        }
    }

    
    //function that clears all existing notifications and updates them with new ones, or sets up notifications for the first time
    $scope.save = function () {

        //Pulls in datetimes for notifications using function below
        var datetime_object = generate_times()

        //resets all notificaitons
        $cordovaLocalNotification.cancelAll();
        $cordovaLocalNotification.clearAll();

        //Creates moring notification
        $cordovaLocalNotification.schedule({
            id: 1,
            firstAt: datetime_object.WDAM,
            every: 'day',
            title: "LongVA",
            text: "Hi! Time for your morning recording.",
            autoCancel: true,
            sound: null
        }).then(function () {
            alert("Morning reminder set")
        });

        //creates evening notification
        $cordovaLocalNotification.schedule({
            id: 2,
            firstAt: datetime_object.WDPM,
            every: 'day',
            title: "LongVA",
            text: "Hi! Time for your evening recording.",
            autoCancel: true,
            sound: null
        }).then(function () {
            alert("Evening reminder set")
        });
        
        //sets firstrun variable to false in localstorage and goes to main menu
        $scope.firstrun = false
        $localstorage.set('firstrun', $scope.firstrun)
        $state.go('mainMenu');
    }


})

.controller('prerecordCtrl', function ($scope, $location, $rootScope, $state, $ionicLoading, $timeout, SCB, $localstorage) {

    //List to populate the radio butons from, values have to be integers for the databases
    $scope.yes_no_list = [
        {
            text: "Yes",
            value: 1
        },
        {
            text: "No",
            value: 0
        }
  ];

    //default values if user doesn't select anything
    $scope.data = {
        elsewhere: 9,
        sick: 9
    };

    
    //starts the recording intereaction
    $scope.begin = function () {
        //storing a flag that we are still recording (determines playback control)
        SCB.setSCB(false);
        $localstorage.setsid();

        //store info into localstorage
        $localstorage.set('elsewhere', $scope.data.elsewhere)
        $localstorage.set('sick', $scope.data.sick)

        //Generating an animated popover to prompt the user to return phone to ear
        $ionicLoading.show({
            template: '<html><body><h1>Getting ready to record! Please put phone to ear and answer the questions you hear</h1><div><img src="img/countdown.gif" /></div></body></html>',
            animation: 'fade-in',
            showBackdrop: false,
            maxWidth: 80,
            showDelay: 0,
            duration: 1800
        });
        $timeout(function () {
            $state.go('alpha', {
                testvar: 1,
                mode: "Recording",
                filepath: null
            });
        }, 1850);

    }

})

.controller('non_audioCtrl', function ($scope, $state, SCB, $localstorage) {

    //Object that stores metadata for additional wellbeing information gathering
    $scope.data = {};
    //Sets a default for the mood slider
    $scope.data.numberSelection = 5;


    SCB.setSCB(false);

    $scope.reviewandfinalise = function () {
        //stores some metadata into local storage
        $localstorage.set('mood', $scope.data.numberSelection)
        $localstorage.set('comments', $scope.data.comments)
        $state.go('review');
    }

})

.controller('reviewCtrl', function ($scope, $location, $http, $state, SCB, $cordovaFile, $localstorage, $ionicPopup) {

    //Pulls in the Session ID and sets the filename for this session's metadata JSON
    var sid = $localstorage.getsid();
    var json_filename = sid + ".json";
    var uid = $localstorage.get('uid');

    //Pulls in recording session for the sake of display and thanking the user
    $scope.session_number = $localstorage.get('session_number');

    //Pulls in question_json for the short names of the recordings
    $scope.quests = $localstorage.getObject('question_json');
    
    
    //metadata for one of the database APIs
    $scope.metadata = {
        sessionIDExt: sid,
        sessionLocation: $localstorage.get('elsewhere'),
        sessionReference: $localstorage.get('mood'),
        sessionCondition: $localstorage.get('sick'),
        sessionComments: $localstorage.get('comments'),
        userID: uid,
        user_ID: uid
    }

    //metadata for one of the database APIs
    $scope.userdata = {
        userID: uid,
        instance: $localstorage.get('instance'),
        password: $localstorage.get('password'),
    }


    //Pulls in the recording names from local storage
    $scope.rec_names = $localstorage.getObject('recording_names');

    //metadata for one of the database APIs
    $scope.audio_file = {
        fileID: sid,
        fileName1: $scope.rec_names.q1,
        fileName2: $scope.rec_names.q2,
        fileName3: $scope.rec_names.q3,
        fileName4: $scope.rec_names.q4,
        fileName5: $scope.rec_names.q5,
        fileName6: $scope.rec_names.q6,
        fileTimestamp: $localstorage.get('javatimestamp'),
        fileSession: $localstorage.get('ampm'),
        filePath: "C:\folder",
        unique_sessionID: sid,
        userID: uid
    }

    //Compiles metadata into object for writing to file
    $scope.data_for_json = {
        cell_user: $scope.userdata,
        audio_file: $scope.audio_file,
        recording_session: $scope.metadata,
        rec_names: $scope.rec_names
    }


    //Sets the Session Complete Boolean to true, meaning that the advance button brings us to 
    SCB.setSCB(true);

    //Sends user to specific question they had selected for rerecording
    $scope.reviewquestions = function (q) {
        $state.go('alpha', {
            testvar: q,
            mode: "Reviewing",
            filepath: null
        })
    }


    //Note: originally architected to go to a page of analytics, but left out due to development constraints
    $scope.analytics = function () {
        
        var alertPopup = $ionicPopup.alert({
                title: 'All done!',
                template: 'Saving for upload the next time you connect to WI-FI'
            });

        // writes metadata to JSON file
        $cordovaFile.writeFile(cordova.file.externalDataDirectory, json_filename, JSON.stringify($scope.data_for_json), true)
            .then(
                function (success) {
                    //on succes, pushes the metadata file's name to localstorage
                    var temp = $localstorage.getArray('metadata_filenames')
                    temp.push(json_filename);
                    $localstorage.setArray('metadata_filenames', temp)
                        //alert('SUCCESS3: ' + JSON.stringify(success));
                },
                function (error) {
                    alert('ERROR3: ' + JSON.stringify(error));
                });

        //resets SCB for the next session
        SCB.setSCB(false)
        
        
        //goes back to main menu
        $state.go('mainMenu')
    }

})

//Currently not used but linked to an view that shows user feedback on how they're doing
.controller('analyticsCtrl', function ($scope, $state) {
    $scope.tomain = function () {
        $state.go('mainMenu')
    }
})


//Main recording interaction control
.controller('alphaCtrl', function ($scope, $state, $stateParams, $http, $ionicLoading, $cordovaMedia, $timeout, $ionicPlatform, $cordovaFile, SCB, $localstorage) {

    console.log(JSON.stringify($stateParams))
    
    //initialisations. Pulling q# and mode out of the state
    $scope.testvar = $stateParams.testvar; //question #
    $scope.flavour_text = $stateParams.mode; // mode / text to be displayed
    $scope.rec_names = $localstorage.getObject('recording_names') //recording names object which this will update
    $scope.show_buttons = false; //hides buttons using ngDirective until the recording is underway
    
    var sid = $localstorage.getsid(); //session ID
    var unique_filename = sid + "_q" + $scope.testvar + ".wav" // filename for recording
    var rec_filepath = cordova.file.externalDataDirectory + unique_filename 
    var recorder // media object of the recorder


    //Q_Audio source and media object
    var src;
    var media; //media object for the question
    var popover_sustain = 1800;
    var number_of_questions; //for generating a breadcrumb array to show user progress

    //Pipes in boolean value of whether we're done with the first pass of the session
    $scope.session_complete = SCB.getSCB();

    //pulls in data from local storage synchronously
    $scope.questions_array = $localstorage.getObject('question_json');
    $scope.qd = $scope.questions_array[$stateParams.testvar];
    src = "questions/" + $scope.qd.Q_Audio //source of the audio file containing the recorded question being asked

    number_of_questions = $scope.questions_array.length - 1;

    //generates an array of true/false litterals, which ng-repeat translates into a breadcrumb trail in the view
    var bca = $scope.questions_array[0]['Q_Number'];
    for (i = 0; i < number_of_questions; i++) {
        if (i < $stateParams.testvar)
            bca[i] = true;
        else
            bca[i] = false;
    }
    $scope.BreadCrumbArray = bca;



    //Control for different modes

    if ($stateParams.mode == "Recording") {
        
        /*
        First recording mode:
        
        plays an animation prompting the user to put the phone to their ear
        Then plays the audio of the question, stops it, and start recording + gives user control buttons
        */
        
        //Generates a popover with instructions to put the phone up to one's ear
        $ionicLoading.show({
            template: '<html><body><h1>Recording, please put phone to ear</h1><ion-spinner class="ripple" icon="ripple"></ion-spinner></body></html>',
            animation: 'fade-in',
            showBackdrop: false,
            maxWidth: 80,
            showDelay: 0,
            duration: popover_sustain
        });

        //generates the question audio media object
        var fullpath = "/android_asset/www/" + src;
        media = new Media(fullpath, null, mediaError);
        var mediaError = function (e) {
            alert("error")
        }

        //waits until popover hides, then plays the question audio file
        $timeout(function () {
            media.play();
        }, popover_sustain);

        /*
        Workaround inspired by plugin developer to get duration, as media creation is aysnc
        Essentially checks every 100ms if the media file has duration
        Then, starts a timeout that will stop and release audio (needed for memory management)
        Shows the buttons, and starts the recorder
        */
        var dur
        var counter = 0;
        var timerDur = setInterval(function () {
            counter = counter + 100;
            if (counter > 2000) {
                clearInterval(timerDur);
            }
            dur = media.getDuration() * 1000;
            if (dur > 0)
            {
                clearInterval(timerDur);
                console.log("found duration:" + dur)
                $timeout(function ()
                {
                    console.log("stopping question")
                    media.stop();
                    media.release();
                    $scope.show_buttons = true;
                    recorder = new Media(rec_filepath);
                    recorder.startRecord();
                }, dur-200);
            }
        }, 100);



    } else if ($stateParams.mode == "Replaying") {
        
        /*
        Replay mode:
        
        Immediately shows control buttons, finds the recording name and creates a media object, plays it back to user
        */
        
        $scope.show_buttons = true;

        var fullpath = rec_filepath;
        media = new Media(fullpath, null, mediaError);
        media.play();
        var mediaError = function (e) {
            alert("Error, file missing or corrupt")
        }
    } else if ($stateParams.mode == "Re-Recording") {
        
        /*
        Re-recording mode:
        
        Immediately shows control buttons, still plays a popover to prompt the user to record with phone next to ear
        Generates a new recording media object to overwrite previous one and starts recording once popover is gone
        */
        
        $scope.show_buttons = true;
        //Generates a re-recording popover with instructions to put the phone up to one's ear
        $ionicLoading.show({
            template: '<html><body><h1>Re-recording question, please put the phone to your ear and speak directly</h1><ion-spinner class="ripple" icon="ripple"></ion-spinner></body></html>',
            animation: 'fade-in',
            showBackdrop: false,
            maxWidth: 80,
            showDelay: 0,
            duration: popover_sustain
        });
        var record_timout = popover_sustain - 1000;
        $timeout(function () {
            recorder = new Media(rec_filepath);
            recorder.startRecord();
        }, record_timout);
    } else if ($stateParams.mode == "Reviewing") {
        /*
        Review mode:
        
        Functionally similar to replay mode
        */
        var fullpath = rec_filepath;
        $scope.show_buttons = true;

        media = new Media(fullpath, null, mediaError);
        media.play();
        var mediaError = function (e) {
            alert("error")
        }
    }


    //Multi-moded buttons

    
    //Advance button
    $scope.advance = function () {
        if ($stateParams.mode == "Reviewing") {
            //If the user presses advance when reviewing, it stops the playback and jumps them back to Review
            if (media != null) {
                media.stop();
                media.release();
            }
            $state.go('review')
        } else if ($stateParams.mode == "Re-Recording" && $scope.session_complete == true) {
            //If the user is re-recording after the session is complete, it stops recording and jumps back to Review
            if (recorder != null) {
                recorder.stopRecord();
                recorder.release();
            }
            $state.go('review')
        } else if ($stateParams.mode == "Replaying" && $scope.session_complete == true) {
            //If the user is replaying a re-recording after the session is complete, it stops recording and jumps back to Review
            if (media != null) {
                media.stop();
                media.release();
            }
            $state.go('review')
        } else if ($stateParams.testvar < number_of_questions) {
            //Stops recording, saves file name and advances to the next question
            if (recorder != null) {
                recorder.stopRecord();
                recorder.release();
            }
            $scope.rec_names["q" + $scope.testvar] = unique_filename
            $localstorage.setObject('recording_names', $scope.rec_names);
            
            //parameterised url
            $state.go('alpha', {
                testvar: $stateParams.testvar + 1,
                mode: "Recording",
                filepath: null
            })
        } else if ($stateParams.testvar == number_of_questions) {
            //Stops recording, saves file name and advances to non-audio questions
            if (recorder != null) {
                recorder.stopRecord();
                recorder.release();
            }
            $scope.rec_names["q" + $scope.testvar] = unique_filename
            $localstorage.setObject('recording_names', $scope.rec_names);
            $state.go('non_audio');
        }
    }

    
    //Re-record button
    $scope.rerecord = function () {
        
        //Stops playback of either recording or question audio and jumps back to the same view with the parameter as re-record
        
        if (recorder != null) {
            recorder.stopRecord();
            recorder.release();
        }

        if (media != null) {
            media.stop()
            media.release()
        }
        $state.go('alpha', {
            testvar: $stateParams.testvar,
            mode: "Re-Recording",
            filepath: null
        })
    }

    
    //Replay button
    $scope.replay = function () {        
        if ($stateParams.mode == "Replaying") {
            //If the user is replaying the audio, stop it and go to the same page and replay again
            if (media != null) {
                media.stop();
                media.release();
            }
            $state.go('alpha', {
                testvar: $stateParams.testvar,
                mode: "Replaying",
                filepath: null
            })
        } else {
            //If the user is recording audio, stop recording and replay it
            if (recorder != null) {
                recorder.stopRecord();
                recorder.release();
            }
            $scope.rec_names["q" + $scope.testvar] = unique_filename //rec_filepath;
            $localstorage.setObject('recording_names', $scope.rec_names);
            $state.transitionTo($state.current, {
                testvar: $stateParams.testvar,
                mode: "Replaying",
                filepath: null
            }, {
                reload: true,
                inherit: false,
                notify: true
            });
        }
    }
})
