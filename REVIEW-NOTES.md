# Review Notes

## Recommendations

### Try to never use globals or module-level variables to indicate state for a functions
For example the function populateDatabase in gather-data.js has the following
where 'heatersMapped' is a module variable:
```
    (err, res) => {
      if (err) console.log(err);
      heatersMapped = true;
    });
```
Instead you should be creating a local variable in the function and then return that variable
from the last executable statement in the function. If your function has multiple exit points,
then return that value from each exit point.


## Code Review Questions
* You are setting 'heatersMapped = true' even if the function fails due to errors. Is that what you want?
