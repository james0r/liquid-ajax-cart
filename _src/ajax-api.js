const REQUEST_ADD = 'add';
const REQUEST_CHANGE = 'change';
const REQUEST_UPDATE = 'update';
const REQUEST_CLEAR = 'clear';
const REQUEST_GET = 'get';

const subscribers = [];

const getEndpoint = ( requestType ) => {
	switch ( requestType ) {
		case REQUEST_ADD:
			return '/cart/add.js';
			break;

		case REQUEST_CHANGE:
			return '/cart/change.js';
			break;

		case REQUEST_GET:
			return '/cart.js';
			break;

		case REQUEST_CLEAR:
			return '/cart/clear.js';
			break;

		case REQUEST_UPDATE:
			return '/cart/update.js';
			break;

		default:
			return undefined;
	}
	return undefined;
}

const cartRequest = ( requestType, body, firstResultCallback = undefined ) => {
	const endpoint = getEndpoint( requestType );
	let requestBody = undefined;
	if ( requestType !== REQUEST_GET ) {
		requestBody = body;
	}
	const method = requestType === REQUEST_GET ? 'GET' : 'POST'
	const resultSubscribers = firstResultCallback === undefined ? [] : [ firstResultCallback ];
	const requestState = {
		requestType,
		endpoint
	}

	subscribers.forEach( callback => {
		try {
			callback({
				requestType,
				endpoint,
				// the same requestBody will be used in the fetch request, 
				// so subscriber can make changes in it before the request
				requestBody

				// if a callback is fired without 'responseData' object in the payload, 
				// it means this is a callback before request is started
			}, resultCallback => resultSubscribers.push( resultCallback ));
		} catch (e) {
			console.error('Liquid Ajax Cart: Error during Ajax request subscriber callback in ajax-api');
			console.error(e);
		}
	})

	requestState.requestBody = requestBody;

	const fetchPayload = {
		method
	}
	if ( requestType !== REQUEST_GET ) {
		if ( requestBody instanceof FormData || requestBody instanceof URLSearchParams ) {
			fetchPayload.body = requestBody;
			fetchPayload.headers = {
		    	'x-requested-with': 'XMLHttpRequest'
		  	}
		} else {
			fetchPayload.body = JSON.stringify(requestBody);
			fetchPayload.headers = {
		    	'Content-Type': 'application/json'
		  	}
		}
	}

	return fetch( 
		endpoint, 
		fetchPayload
	).then( response => {
		return response.json().then( responseBody => {
			return {
				ok: response.ok,
				status: response.status,
				body: responseBody
			}
		});
	}).then( data => {

		requestState.responseData = data;

		if ( REQUEST_ADD !== requestType) {
			return requestState;
		}

		// if requestType is REQUEST_ADD lets call 'get' also to update cart json
		// for state and all the subscribers
		return fetch ( getEndpoint( REQUEST_GET ), {
			method: 'GET',
			headers: {
		    	'Content-Type': 'application/json'
		  	}
		}).then( response => response.json().then( responseBody => {
				requestState.extraResponseData = {
					ok: response.ok,
					status: response.status,
					body: responseBody
				};
				return requestState;
			})
		);

	}).catch( error => {
		console.error('Liquid Ajax Cart: Error while performing cart Ajax request')
		console.error(error);
		requestState.fetchError = error;
		throw requestState;
	}).finally(() => {
		resultSubscribers.forEach( callback => {
			try {
				callback(requestState);
			} catch (e) {
				console.error('Liquid Ajax Cart: Error during Ajax request result callback in ajax-api');
				console.error(e);
			}
		})
	});
}

const cartRequestGet = ( firstResultCallback ) => {
	return cartRequest( REQUEST_GET, undefined, firstResultCallback );
}

const cartRequestAdd = ( body, firstResultCallback ) => {
	return cartRequest( REQUEST_ADD, body, firstResultCallback );
}

const cartRequestChange = ( body, firstResultCallback ) => {
	return cartRequest( REQUEST_CHANGE, body, firstResultCallback );
}

const cartRequestUpdate = ( body, firstResultCallback ) => {
	return cartRequest( REQUEST_UPDATE, body, firstResultCallback );
}

const cartRequestClear = ( firstResultCallback ) => {
	return cartRequest( REQUEST_CLEAR, {}, firstResultCallback );
}

const subscribeToCartAjaxRequests = ( callback ) => {
	subscribers.push( callback );
}

export { 
	cartRequestAdd, 
	cartRequestChange, 
	cartRequestClear, 
	cartRequestGet, 
	cartRequestUpdate, 
	subscribeToCartAjaxRequests, 
	REQUEST_ADD 
}