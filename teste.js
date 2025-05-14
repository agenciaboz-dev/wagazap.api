document.getElementById('formulario_palito').addEventListener('submit', function(e) {
    const API_URL = 'http://192.168.15.17:8090/signup'
    e.preventDefault(); // Prevent form submission
    
    // Create FormData object from the form
    const formData = new FormData(this);
    
    // Convert FormData to a plain object
    const formValues = {};
    for (const [key, value] of formData.entries()) {
        formValues[key] = value;
    }
    
    // Log the form data to console
    console.log('Form Data:', formValues);

    fetch(API_URL, { method: 'POST', body: formData }).then(response => {
        const response_data = response.json()
        console.log('respondeu')
        console.log(response_data)
    }).catch(error => {
        console.log('erro')
        console.log(error)
    })
    
    
    // If you want to actually submit the form after logging, you can call:
    // this.submit();
});