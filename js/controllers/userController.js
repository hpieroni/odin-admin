var app = angular.module('odin.userControllers', []);

app.factory('model', function($resource) {
    return $resource();
});



function UserListController($scope, $location, rest, $rootScope, Flash,Alertify,modelService) {

  modelService.initService("User","users",$scope);

    $scope.confirmDelete=function (item){
        modelService.confirmDelete(item);
    }

    $scope.deleteModel = function(model) {
        modelService.delete($scope,model);
    };

    $scope.edit = function(model) {
        modelService.edit($scope,model);
    }

    $scope.view = function(model) {
        modelService.view($scope,model);
    }

    modelService.loadAll($scope);
}

function UserViewController($scope, Flash, rest, $routeParams, $location,modelService) {
  modelService.initService("User","users",$scope);

    modelService.findOne($routeParams,$scope);


    $scope.edit = function(model) {
        modelService.edit($scope,model);
    }
}

function UserCreateController($scope, rest, model, Flash,$location,modelService) {
  modelService.initService("User","users",$scope);

    $scope.model = new model();
    $scope.add = function(isValid) {
        if (isValid) {
            rest().save({
                type: $scope.type
            }, $scope.model,function (resp){

                if(!!resp.data){
                    var url = '/'+$scope.type+'/' + resp.data.id + "/edit";
                    
                }else{
                    var url = '/'+$scope.type+'/';
                }
                $location.path(url);
        
            });
        }
    };
}

function UserEditController($scope, Flash, rest, $routeParams, model,$location, modelService) {
  modelService.initService("User","users",$scope);

    $scope.model = new model();
    $scope.update = function(isValid) {
        if (isValid) {
            rest().update({
                type: $scope.type,
                id: $scope.model.id
            }, $scope.model,function (){
                var url = '/'+$scope.type+'/';
                $location.path(url);
            });
        }
    };

    $scope.load = function() {
        $scope.model = rest().findOne({
            id: $routeParams.id,
            type: $scope.type
        },function (){
           // $scope.model.organization=$scope.model.organization.id
        });
    };

    $scope.load();
}