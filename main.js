var app = angular.module('bills', []);

app.factory('Data', function() {
		return [{
				name: 'jordan',
				items: [{
						name: 'french toast',
						price: 24.95
				},
				{
						name: 'pancacke',
						price: 14.95
				}]
		}];
});

var f = {};

f.parseMoney = function(str) {
		return parseFloat(str).toFixed(2);
}

f.sum = function(vals) {
		return vals.reduce(function(prev, curr, ind, arr) {
				return parseFloat(prev) + parseFloat(curr);
		}, 0);
}

f.itemPrices = function(items) {
		return (items.length == 0) ? [] : items.map(function(val) {
				return val.price;
		});
};

app.directive('editable', function() {
		return {
				restrict: "C",
				scope: {
						editableValue: "=",
				},
				template: '<span ng-click="showEdit()" class="display-value">{{editableValue}}</span>' +
						'<form ng-submit="saveAndRemove()" class="editable-form"><input ng-model="newValue" /><input type="submit" value="Submit" /></form>',
				link: function(scope, element, attrs) {
						// initial value
						scope.newValue = scope.editableValue;
						scope.showEdit = function() {
								element.addClass('is-editing');
						}

						scope.saveAndRemove = function() {
								scope.editableValue = scope.newValue;
								element.removeClass('is-editing');
						}
				}
		}
});

function PeopleCtrl($scope, Data) {
		$scope.people = Data;

		$scope.addPerson = function() {
				$scope.people.push({
						name: $scope.personName,
						items: []
				});
				$scope.personName = '';
		};
}

function PersonCtrl($scope) {
		$scope.taxPercent = .0875;

		$scope.$watch('person.items', function(items) {
				$scope.person.subtotal = f.sum(f.itemPrices(items));
				$scope.person.tax      = $scope.person.subtotal * $scope.taxPercent;
				$scope.person.total    = $scope.person.subtotal + $scope.person.tax;
		});

		$scope.addItem = function() {
				$scope.person.items.push({
						name: $scope.itemName,
						price: f.parseMoney($scope.itemPrice)
				});

				$scope.itemName = '';
				$scope.itemPrice = '';
		}
}
