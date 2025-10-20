/**
 * Array extensions
 *
 * Adds Ejscript methods to the Array prototype
 * @spec ejs
 */
// ============================================================================
// Search Methods
// ============================================================================
/**
 * Check if array contains an item using strict equality
 */
Array.prototype.contains = function (item) {
    return this.indexOf(item) >= 0;
};
// ============================================================================
// Array Manipulation
// ============================================================================
/**
 * Append items to array (mutates array)
 */
Array.prototype.append = function (item) {
    if (Array.isArray(item)) {
        this.push(...item);
    }
    else {
        this.push(item);
    }
    return this;
};
/**
 * Clear all elements from the array
 */
Array.prototype.clear = function () {
    this.length = 0;
};
/**
 * Remove all null and undefined elements
 */
Array.prototype.compact = function () {
    for (let i = this.length - 1; i >= 0; i--) {
        if (this[i] === null || this[i] === undefined) {
            this.splice(i, 1);
        }
    }
    return this;
};
/**
 * Remove elements from start to end (inclusive)
 * Negative indices measure from the end of the array
 */
Array.prototype.remove = function (start, end = -1) {
    if (start < 0) {
        start += this.length;
    }
    if (end < 0) {
        end += this.length;
    }
    this.splice(start, end - start + 1);
};
// ============================================================================
// Transformation Methods
// ============================================================================
/**
 * Transform array elements in-place
 * Modifies the original array
 */
Array.prototype.transform = function (fn) {
    for (let i = 0; i < this.length; i++) {
        this[i] = fn(this[i], i, this);
    }
    return this;
};
/**
 * Clone the array
 * @param deep If true, recursively clone nested arrays and objects
 */
Array.prototype.clone = function (deep = true) {
    if (!deep) {
        return [...this];
    }
    // Deep clone
    return this.map(item => {
        if (Array.isArray(item)) {
            return item.clone(true);
        }
        else if (item && typeof item === 'object' && item.constructor === Object) {
            // Clone plain objects
            const cloned = {};
            for (const key in item) {
                if (Object.prototype.hasOwnProperty.call(item, key)) {
                    const value = item[key];
                    if (Array.isArray(value)) {
                        cloned[key] = value.clone(true);
                    }
                    else if (value && typeof value === 'object' && value.constructor === Object) {
                        cloned[key] = Object.assign({}, value);
                    }
                    else {
                        cloned[key] = value;
                    }
                }
            }
            return cloned;
        }
        return item;
    });
};
/**
 * Remove duplicate elements
 */
Array.prototype.unique = function () {
    return Array.from(new Set(this));
};
// ============================================================================
// Filtering Methods
// ============================================================================
/**
 * Find all elements matching the predicate
 * Alias for filter()
 */
Array.prototype.findAll = function (match) {
    return this.filter(match);
};
/**
 * Find all elements that do NOT match the predicate
 * Opposite of filter()
 */
Array.prototype.reject = function (match) {
    const result = [];
    for (let i = 0; i < this.length; i++) {
        if (!match(this[i], i, this)) {
            result.push(this[i]);
        }
    }
    return result;
};
export {};
//# sourceMappingURL=ArrayExtensions.js.map