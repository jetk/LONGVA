angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'loginCtrl'
    })
        
    .state('mainMenu', {
      url: '/main',
      templateUrl: 'templates/mainMenu.html',
      controller: 'mainMenuCtrl'
    })
    
    .state('settings', {
        url: '/settings',
        templateUrl: 'templates/settings.html',
        controller: 'settingsCtrl'
    })
      
    .state('prerecord', {
        url: '/prerecord',
        templateUrl: 'templates/prerecord.html',
        controller: 'prerecordCtrl'
    })

    .state('non_audio', {
        url: '/non_audio',
        templateUrl: 'templates/non_audio.html',
        controller: 'non_audioCtrl'
    })

  .state('review', {
      url: '/review',
      templateUrl: 'templates/review.html',
      controller: 'reviewCtrl'
  })

.state('analytics', {
     url: '/analytics',
     templateUrl: 'templates/analytics.html',
     controller: 'analyticsCtrl'
 })

.state('alpha', {
    cache: false,
    url: '/alpha/{testvar:int}/:mode/:filepath',
    templateUrl: 'templates/alpha.html',
    controller: 'alphaCtrl'
})

    ;
    

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');

});