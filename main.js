var app = angular.module('bills', []);

app.factory('Data', function() {
		return [];
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

app.filter('percent', function() {
		return function(input) {
				var normalized = input * 100;
				return normalized + '%';
		}
});

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

app.directive('focusMe', function($parse) {
		return {
				scope: '=',
				link: function(scope, element, attrs) {
						var parsedAttrs = $parse(attrs.focusMe)();
						var toEqual     = scope[parsedAttrs.toEqual];
						scope.$watch(scope[parsedAttrs.watch], function(value) {
								if (scope[parsedAttrs.watch] == toEqual) {
										element[0].focus();
								}
						});
				}
		};
});

app.directive('swiperight', function() {
		var listenOnce = function(el, eventName, fn) {
				var newFn = function(event) {
						fn(event);
						removeListener();
				};
				var removeListener = function() {
						el.removeEventListener(eventName, newFn);
				};
				el.addEventListener(eventName, newFn);
		};

		return {
				restrict: "A",
				scope: false,
				link: function(scope, element, attrs) {
						Hammer(element[0]).on('swiperight', function(event) {
								var toShow = event.currentTarget.querySelector('.show-on-swiperight');
								angular.element(toShow).addClass('showing');
								// because chrome fires click -> doubletap -> click
								setTimeout(function(){
										listenOnce(document, 'tap', function() {
												angular.element(document.querySelectorAll('.show-on-swiperight.showing')).removeClass('showing');
										});
								});
						});
				}
		}
});

function AppController($scope, Data) {
		$scope.people = Data;
		$scope.taxPercent = .0875;
		$scope.total = 0;
		$scope.recommendedTipPercents = [.15, .18, .20];
		// array of {key: value (percentage)} to be applied to subtotal
		$scope.subtotalGratuities = [
				{
						name: 'tax',
						percent: .0875
				}
		];
		// array of {key: value (percentage)} to be applied to total 
		$scope.totalGratuities = [];

		$scope.updateTotal = function() {
				$scope.total = $scope.people.reduce(function(total, person) {
						return total + person.total;
				}, 0);
		};

		$scope.mode = 'input';
		$scope.switchButtonText = 'summary';
		$scope.switch = function() {
				$scope.switchButtonText = $scope.mode;
				if ($scope.mode == 'summary') {
						$scope.mode = 'input';
				} else {
						$scope.mode = 'summary';
				}
		};
}

function SummaryCtrl($scope) {
}

function PeopleCtrl($scope) {
		$scope.activePerson;

		$scope.toggleActivePerson = function(person) {
				if ($scope.activePerson === person) {
						$scope.activePerson = null;
				} else {
						$scope.activePerson = person;
				}
		};

		$scope.addPerson = function() {
				var person = {
						name: $scope.personName,
						items: []
				};
				$scope.people.unshift(person);
				$scope.personName = '';
				$scope.activePerson = person;
				$scope.focusedPerson = person;
		};
}

function PersonCtrl($scope) {
		$scope.addItem = function() {
				$scope.person.items.unshift({
						name: $scope.itemName,
						price: f.parseMoney($scope.itemPrice)
				});

				$scope.itemName = '';
				$scope.itemPrice = '';
				$scope.calculateTaxTotal();
		}

		$scope.updateRecommendedTips = function() {
				$scope.person.recommenededTips = {};
				$scope.person.recommendedTips = $scope.recommendedTipPercents.map(function(percent) {
						return {
								percent: percent,
								amt: $scope.person.total * (1 + percent)
						}
				}, this);
		};

		$scope.calculateTaxTotal = function() {
				console.log('calculating subtotal/tax/total');
				var items = $scope.person.items;
				$scope.person.subtotal = f.sum(f.itemPrices(items));

				$scope.person.additionsToSubtotal = $scope.subtotalGratuities.map(function(item) {
						return {
								name: item.name,
								percent: item.percent,
								amt: item.percent * ($scope.person.subtotal)
						};
				}, this);

				$scope.person.total = $scope.person.additionsToSubtotal.reduce(function(prev, curr) {
						return prev + curr.amt;
				}, $scope.person.subtotal);

				$scope.person.additionsToTotal = $scope.totalGratuities.map(function(item) {
						return {
								name: item.name,
								percent: item.percent,
								amt: item.percent * ($scope.person.total)
						};
				}, this);

				$scope.person.total = $scope.person.additionsToTotal.reduce(function(prev, curr) {
						return prev + curr.amt;
				}, $scope.person.total);

				// update the global total
				$scope.updateTotal();

				$scope.updateRecommendedTips();
		};

		$scope.removeItem = function(item) {
				$scope.person.items.splice($scope.person.items.indexOf(item), 1);
				$scope.calculateTaxTotal();
		};

		$scope.$watch('person.items', function(items) {
				$scope.calculateTaxTotal();
		});
}
