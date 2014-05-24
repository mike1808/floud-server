'use strict';

var app = angular.module('floud', [
    'ngRoute', 'LocalStorageModule', 'mgcrea.ngStrap', 'cfp.hotkeys', 'angularFileUpload', 'angular-growl', 'angularMoment',
    'floud.controllers', 'floud.services', 'floud.directives'
]);

angular.module('LocalStorageModule').value('prefix', 'floud');

angular.module('floud.controllers', []);
angular.module('floud.services', ['ngResource']);
angular.module('floud.directives', []);

app.config(['$routeProvider', '$locationProvider' , '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {
    $locationProvider.html5Mode(true).hashPrefix('!');

    $routeProvider.
        when('/', { templateUrl: '/views/index.html', controller: 'FileCtrl as ctrl'}, { reloadOnSearch: false }).
        when('/login', { templateUrl: '/views/login.html', controller: 'UserCtrl'}).
        when('/signup', { templateUrl: '/views/signup.html', controller: 'UserCtrl'}).

        otherwise({ redirectTo: '/'});

}]);

app.filter('bytes', function() {
    return function(bytes, precision) {
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
        if (typeof precision === 'undefined') precision = 1;
        var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
            number = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
    }
});