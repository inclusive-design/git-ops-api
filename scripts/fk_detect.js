module.exports = {
	/**
	 * Find the number of unique intersected valus between two columns
	 * @param {Column} PCol - Column from data set to compare
	 * @param {Column} FCol - Column from data set to compare
	 */
	inclusion: function (PCol, FCol) {
		if (PCol.length===0 || FCol.length===0) {
			return 0
		}

		PCol = [...new Set(PCol)];
		FCol = [...new Set(FCol)];

		return PCol.filter(x => FCol.includes(x)).length; // Intersection
	}
};