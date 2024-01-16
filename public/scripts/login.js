$(document).ready(function () {
    $('#login-form').submit(function (e) {
        e.preventDefault();

        const username = $('#username').val();
        const password = $('#password').val();

        handleAction({ action: 'Login', username, password });
    });

    function sendPostRequest(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok (${response.statusText})`);
            }
            return response.json();
        })
        .catch(error => {
            console.error(error);
            console.log('Response Text:', error.response && error.response.text());
        });
    }
    

    function handleAction(inputData) {
        const apiUrl = 'http://localhost:3000/admin/login';
        console.log(apiUrl);
    
        sendPostRequest(apiUrl, inputData)
            .then(response => {
                console.log('Server response:', response);
    
                if (response && response.success) {
                    window.location.href = response.redirect;
                } else {
                    alert(response && (response.message || 'Invalid credentials. Try again.'));
                }
            });
    }
});
