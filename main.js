angular.module('LocalStorageModule').value('prefix', 'bwf');

var app = angular.module('bills', ['hmTouchEvents', 'LocalStorageModule']);

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
						Hammer(element[0]).on('dragright', function(event) {
								var currentTarget = angular.element(event.currentTarget).addClass('swipe-overlay');
								var toShow = event.currentTarget.querySelector('.show-on-swiperight');
								angular.element(toShow).addClass('showing');
								// because chrome fires click -> doubletap -> click
								setTimeout(function(){
										listenOnce(document, 'tap', function() {
												setTimeout(function() {
														angular.element(document.querySelectorAll('.show-on-swiperight.showing')).removeClass('showing');
														currentTarget.removeClass('swipe-overlay');
												}, 0);
										});
								}, 0);
						});
				}
		}
});

function AppController($scope, localStorageService) {
		/**
		 * What mode the app is in
		 */
		$scope.mode = 'person';

		$scope.people = [];
		$scope.items = [];
		$scope.total = 0;

		$scope.peopleTotals = {};

		/**
		 * Generate the data structure for the per person subtotals/totals
		 *
		 * @param {Array} of Item objects
		 */

		// array of {key: value (percentage)} to be applied to subtotal
		$scope.subtotalGratuities = [
				{
						name: 'tax',
						percent: .0875
				}
		];

		// array of {key: value (percentage)} to be applied to total 
		$scope.totalGratuities = [];

		$scope.save = function() {
				var toSave = {
						people: $scope.people,
						items: $scope.items,
						total: $scope.total,
						peopleTotals: $scope.peopleTotals,
				};

				localStorageService.set('data', toSave);
		};

		$scope.load = function() {
				var data = localStorageService.get('data');
				if (!data) {
						return;
				}

				$scope.people = data.people;
				$scope.items = data.items;
				$scope.total = data.total;
		};

		$scope.reset = function() {
				$scope.people = [];
				$scope.items = [];
				$scope.total = 0;
				$scope.peopleTotals = {};
		}

		$scope.updateTotal = function() {
				$scope.total = $scope.people.reduce(function(total, person) {
						return total + person.total;
				}, 0);
		};

		$scope.getPerson = function(id) {
				var filtered = $scope.people.filter(function(person){
						return person.id === id;
				});
				return filtered[0];
		};

		$scope.mapPeople = function(items) {
				// reset all meta values on each person
				$scope.people.map(function(person) {
						person.items = [];
						person.subtotal = 0;
						person.subtotalGratuities = [];
						person.totalGratuities = [];
						person.total = 0;
				});

				// calculate subtotals/pretotal for each person
				$scope.items.map(function(item) {
						item.people.map(function(personId) {
								var personRef = $scope.getPerson(personId);

								var amount = item.price / item.people.length;
								personRef.subtotal += amount;
								personRef.total += amount;
								personRef.items.push({
										name: item.name,
										amount: amount,
								});
						});
				});

				// calculate subtotal gratuities and fill in person.pretotal
				$scope.people.map(function(person) {
						$scope.subtotalGratuities.map(function(grat) {
								var amount = person.subtotal * grat.percent;
								person.subtotalGratuities.push({
										name: grat.name,
										amount: amount,
								});

								person.total += amount;
						});
				});

				// calculate actual total from totalGratuities
				$scope.people.map(function(person) {
						var preTotal = person.total
						$scope.totalGratuities.map(function(grat) {
								var amount = preTotal * grat.percent;
								person.totalGratuities.push({
										name: grat.name,
										amount: amount,
								});

								person.total += amount;
						});
				});
		}

		$scope.load();

		$scope.$watch('items', $scope.mapPeople, true);
		$scope.$watch('items', $scope.save, true);
		$scope.$watch('people', $scope.save, true);
}

function PeopleCtrl($scope) {
		var personId = 1;

		$scope.addPerson = function() {
				var person = {
						id: personId,
						name: $scope.personName,
						items: []
				};
				$scope.people.unshift(person);
				$scope.personName = '';
				personId++;
		};

		$scope.deletePerson = function(person) {
				var ind = $scope.people.indexOf(person);
				if (ind > -1) {
						$scope.people.splice(ind, 1);
				}
		};
}

function ItemsCtrl($scope) {
		$scope.itemAction = 'add';

		$scope.editingItem;

		$scope.addItem = function(item) {
				$scope.items.push(item);
		};

		$scope.editItem = function(item) {
				$scope.editingItem = item;
				$scope.currentItem = angular.copy(item);
				$scope.itemAction = 'edit';
		};

		$scope.cancelEdit = function() {
				$scope.itemAction = 'add';
				$scope.resetCurrentItem();
				$scope.editingItem = null;
		};

		$scope.resetCurrentItem = function() {
				$scope.currentItem = {};
				$scope.currentItem.name = '';
				$scope.currentItem.price = 0;
				$scope.currentItem.people = [];
		};

		$scope.submitItem = function() {
				if ($scope.itemAction == 'add') {
						$scope.items.push($scope.currentItem);
						$scope.resetCurrentItem();
				} else if ($scope.itemAction == 'edit') {
						// replace item in array with the current edited values
						$scope.items[$scope.items.indexOf($scope.editingItem)] = $scope.currentItem;

						$scope.cancelEdit();
				}
		};

		$scope.resetCurrentItem();

		$scope.deleteItem = function(item) {
				var ind = $scope.items.indexOf(item);
				if (ind > -1) {
						$scope.items.splice(ind, 1);
				}
		};
}

function GratuityCtrl($scope) {

}
