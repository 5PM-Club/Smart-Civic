const supabase = require('./config/supabase');
async function run() {
    const { data, error } = await supabase.from('complaints').select('*').limit(1);
    if(error) {
        console.error(error);
    } else {
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('No data found, cannot infer schema via select *');
        }
    }
}
run();
